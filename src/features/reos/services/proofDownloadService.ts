import { recordAuditEvent } from "./auditService";
import { getBranchProcessingQueue, type BranchProcessingQueueStatus } from "./branchProcessingQueueService";
import { getAssignmentsByBranch } from "./sharedBatchStore";
import type {
  BatchDownloadSummary,
  DownloadableProof,
  MarkBatchDownloadedInput,
  ProofDownloadBatch,
  ProofDownloadHistoryEntry,
  ProofDownloadRequest,
} from "../types/proofDownload";
import type { ProofOfPayment } from "../types/proofOfPayment";
import type { SharedBatch } from "../types/sharedBatch";
import type { CreditToAccountTransaction, CreditToAccountTransactionStatus } from "../types/transactionProcessing";

const textEncoder = new TextEncoder();
let crcTable: Uint32Array | null = null;

/**
 * Builds a ProofDownloadBatch view of a Shared Batch from Branch Processing's current
 * queue state - the read side of the Branch Processing -> Proof Management handoff.
 * Returns null if the Shared Batch has not been assigned to a branch.
 */
export async function buildProofDownloadBatchFromSharedBatch(sharedBatch: SharedBatch): Promise<ProofDownloadBatch | null> {
  if (!sharedBatch.assignedBranchId) {
    return null;
  }

  const branchAssignments = await getAssignmentsByBranch(sharedBatch.assignedBranchId);
  const assignmentIds = new Set(
    branchAssignments
      .filter((assignment) => assignment.sharedBatchId === sharedBatch.id)
      .map((assignment) => assignment.id),
  );

  const branchQueueItems = await getBranchProcessingQueue(sharedBatch.assignedBranchId);
  const assignedQueueItems = branchQueueItems.filter((item) => assignmentIds.has(item.assignmentId));

  const transactions: CreditToAccountTransaction[] = assignedQueueItems.map((item) => ({
    id: item.id,
    beneficiary: item.beneficiary,
    status: toTransactionStatus(item.status),
    proofs: item.proofs,
    completedByUserId: item.completedByUserId,
    completedAt: item.completedAt,
    returnedByUserId: item.returnedByUserId,
    returnedAt: item.returnedAt,
    returnReason: item.returnReason,
    returnComment: item.returnComment,
  }));

  return {
    id: sharedBatch.id,
    sharedBatchReference: sharedBatch.reference,
    assignedBranchId: sharedBatch.assignedBranchId,
    lifecycleStatus: sharedBatch.lifecycleStatus,
    transactions,
    // Sourced from the real 5-value BranchProcessingQueueStatus, not from `transactions`
    // above - toTransactionStatus deliberately collapses ASSIGNED/IN_PROGRESS/ON_HOLD
    // into PENDING for the download-eligibility decision (REPORTING_PROJECTION_LAYER.md
    // 4.4: "the layer never maps up"), which would make on-hold work invisible to the
    // Direct Remit Officer - the only role who never sees the OM-only Reports page.
    onHoldTransactions: assignedQueueItems
      .filter((item) => item.status === "ON_HOLD")
      .map((item) => ({
        transactionId: item.id,
        directRemitReference: item.beneficiary.directRemitReference,
        beneficiaryName: item.beneficiary.beneficiaryName,
        holdReason: item.holdReason,
        holdComment: item.holdComment,
        heldAt: item.heldAt,
      })),
    downloadedByUserId: null,
    downloadedAt: null,
  };
}

/**
 * Moves a Shared Batch from COMPLETED to READY_FOR_DOWNLOAD (LIFECYCLE.md), making it
 * eligible for the next Proof Management step. Direct Remit Officer only, matching
 * LIFECYCLE.md's Role Ownership for this transition.
 */
export function markSharedBatchReadyForDownload(request: ProofDownloadRequest): ProofDownloadBatch {
  assertDirectRemitOfficer(request.actorRole);

  if (request.batch.lifecycleStatus !== "COMPLETED") {
    throw new Error("Only completed batches may be marked ready for proof download.");
  }

  return {
    ...request.batch,
    lifecycleStatus: "READY_FOR_DOWNLOAD",
  };
}

function toTransactionStatus(status: BranchProcessingQueueStatus): CreditToAccountTransactionStatus {
  if (status === "COMPLETED") {
    return "COMPLETED";
  }

  if (status === "RETURNED") {
    return "RETURNED";
  }

  return "PENDING";
}

export function getBatchDownloadSummary(batch: ProofDownloadBatch): BatchDownloadSummary {
  const downloadableProofs = getDownloadableProofs(batch);

  return {
    sharedBatchReference: batch.sharedBatchReference,
    assignedBranchId: batch.assignedBranchId,
    transactionCount: batch.transactions.length,
    proofImageCount: downloadableProofs.length,
    completedTransactionCount: batch.transactions.filter((transaction) => transaction.status === "COMPLETED").length,
    returnedTransactionCount: batch.transactions.filter((transaction) => transaction.status === "RETURNED").length,
    onHoldTransactionCount: batch.onHoldTransactions.length,
    lifecycleStatus: batch.lifecycleStatus,
    downloadedByUserId: batch.downloadedByUserId,
    downloadedAt: batch.downloadedAt,
  };
}

/**
 * A proof is only truly downloadable once its own transaction is COMPLETED - a proof
 * image can be attached to a queue item before the officer clicks Complete (upload and
 * completion are separate steps), so transaction.status is the real gate, not just
 * proof presence. Deliberately independent of the batch's own lifecycleStatus: the
 * Direct Remit Officer should see and download a completed transaction's proof the
 * moment it's done, without waiting for every other transaction in the batch to finish.
 */
export function getDownloadableProofs(batch: ProofDownloadBatch): DownloadableProof[] {
  return batch.transactions
    .filter((transaction) => transaction.status === "COMPLETED")
    .flatMap((transaction) =>
      transaction.proofs
        .filter((proof) => proof.fileType.startsWith("image/") && proof.status !== "EXPIRED")
        .map((proof) => ({
          transactionId: transaction.id,
          directRemitReference: transaction.beneficiary.directRemitReference,
          beneficiaryName: transaction.beneficiary.beneficiaryName,
          currency: transaction.beneficiary.currency,
          amount: transaction.beneficiary.amount,
          proof,
        })),
    );
}

export async function downloadProofZip(request: ProofDownloadRequest): Promise<ProofDownloadHistoryEntry> {
  assertDirectRemitOfficer(request.actorRole);
  assertBatchReadyForDownload(request.batch);

  const proofFiles = getDownloadableProofs(request.batch);

  if (proofFiles.length === 0) {
    throw new Error("No proof images are available to download.");
  }

  const zipEntries = await Promise.all(
    proofFiles.map(async ({ directRemitReference, proof }, index) => ({
      name: `${sanitizeFileName(directRemitReference)}-${String(index + 1).padStart(2, "0")}-${sanitizeFileName(proof.fileName)}`,
      data: new Uint8Array(await fetchProofBytes(proof)),
    })),
  );

  const zipBlob = createZipBlob(zipEntries);
  triggerDownload(zipBlob, `${sanitizeFileName(request.batch.sharedBatchReference)}-proofs.zip`);

  const details = `Downloaded ${proofFiles.length} proof image(s) as ZIP.`;

  await recordAuditEvent({
    actorUserId: request.actorUserId,
    action: "PROOF_ZIP_DOWNLOADED",
    entityType: "SHARED_BATCH",
    entityId: request.batch.id,
    branchId: request.batch.assignedBranchId,
    details,
  });

  return createHistoryEntry(request.batch.id, "ZIP_DOWNLOADED", request.actorUserId, details);
}

export async function downloadIndividualProof(
  request: ProofDownloadRequest,
  proof: ProofOfPayment,
): Promise<ProofDownloadHistoryEntry> {
  assertDirectRemitOfficer(request.actorRole);

  // Deliberately not gated on the batch's own lifecycleStatus (unlike the ZIP-all and
  // mark-downloaded actions below, which really are whole-batch operations) - a single
  // completed transaction's proof should be downloadable as soon as that transaction is
  // done, regardless of whether the rest of the batch has finished processing.
  if (!proof.fileType.startsWith("image/") || proof.status === "EXPIRED") {
    throw new Error("Only available proof images may be downloaded.");
  }

  const proofBlob = new Blob([await fetchProofBytes(proof)], { type: proof.fileType });
  triggerDownload(proofBlob, proof.fileName);

  const details = `Downloaded proof ${proof.fileName}.`;

  await recordAuditEvent({
    actorUserId: request.actorUserId,
    action: "PROOF_DOWNLOADED",
    entityType: "PROOF",
    entityId: proof.id,
    branchId: request.batch.assignedBranchId,
    details,
  });

  return createHistoryEntry(request.batch.id, "PROOF_DOWNLOADED", request.actorUserId, details);
}

export async function markBatchDownloaded(input: MarkBatchDownloadedInput): Promise<{
  batch: ProofDownloadBatch;
  history: ProofDownloadHistoryEntry;
}> {
  assertDirectRemitOfficer(input.actorRole);

  if (input.batch.lifecycleStatus !== "READY_FOR_DOWNLOAD") {
    throw new Error("Only Shared Batches ready for download may be marked as downloaded.");
  }

  const downloadedAt = new Date().toISOString();
  const details = "Marked Shared Batch as DOWNLOADED.";

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "BATCH_MARKED_DOWNLOADED",
    entityType: "SHARED_BATCH",
    entityId: input.batch.id,
    branchId: input.batch.assignedBranchId,
    details,
    performedAt: downloadedAt,
  });

  return {
    batch: {
      ...input.batch,
      lifecycleStatus: "DOWNLOADED",
      downloadedByUserId: input.actorUserId,
      downloadedAt,
    },
    history: createHistoryEntry(input.batch.id, "BATCH_MARKED_DOWNLOADED", input.actorUserId, details, downloadedAt),
  };
}

function assertDirectRemitOfficer(actorRole: ProofDownloadRequest["actorRole"]): void {
  if (actorRole !== "DIRECT_REMIT_OFFICER") {
    throw new Error("Only the Direct Remit Officer may perform proof download actions.");
  }
}

function assertBatchReadyForDownload(batch: ProofDownloadBatch): void {
  if (batch.lifecycleStatus !== "READY_FOR_DOWNLOAD" && batch.lifecycleStatus !== "DOWNLOADED") {
    throw new Error("Only completed batches ready for download may be opened for proof download.");
  }
}

async function fetchProofBytes(proof: ProofOfPayment): Promise<ArrayBuffer> {
  const response = await fetch(proof.previewUrl);

  if (!response.ok) {
    throw new Error(`Unable to load proof ${proof.fileName}.`);
  }

  return response.arrayBuffer();
}

function createZipBlob(entries: Array<{ name: string; data: Uint8Array }>): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = textEncoder.encode(entry.name);
    const crc = getCrc32(entry.data);
    const { dosDate, dosTime } = getDosDateTime(new Date());
    const localHeader = createHeader([
      0x04034b50,
      20,
      0,
      0,
      dosTime,
      dosDate,
      crc,
      entry.data.length,
      entry.data.length,
      fileName.length,
      0,
    ], [4, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2]);
    const centralHeader = createHeader([
      0x02014b50,
      20,
      20,
      0,
      0,
      dosTime,
      dosDate,
      crc,
      entry.data.length,
      entry.data.length,
      fileName.length,
      0,
      0,
      0,
      0,
      0,
      offset,
    ], [4, 2, 2, 2, 2, 2, 2, 4, 4, 4, 2, 2, 2, 2, 2, 4, 4]);

    localParts.push(localHeader, fileName, entry.data);
    centralParts.push(centralHeader, fileName);
    offset += localHeader.length + fileName.length + entry.data.length;
  }

  const centralDirectorySize = centralParts.reduce((total, part) => total + part.length, 0);
  const endRecord = createHeader([
    0x06054b50,
    0,
    0,
    entries.length,
    entries.length,
    centralDirectorySize,
    offset,
    0,
  ], [4, 2, 2, 2, 2, 4, 4, 2]);

  const blobParts = [...localParts, ...centralParts, endRecord].map(toArrayBuffer);

  return new Blob(blobParts, { type: "application/zip" });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function createHeader(values: number[], byteWidths: number[]): Uint8Array {
  const size = byteWidths.reduce((total, width) => total + width, 0);
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  let offset = 0;

  values.forEach((value, index) => {
    const width = byteWidths[index];

    if (width === 2) {
      view.setUint16(offset, value, true);
    } else {
      view.setUint32(offset, value, true);
    }

    offset += width;
  });

  return bytes;
}

function getCrc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getCrcTable(): Uint32Array {
  if (crcTable) {
    return crcTable;
  }

  crcTable = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    crcTable[index] = crc >>> 0;
  }

  return crcTable;
}

function getDosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.max(date.getFullYear(), 1980);

  return {
    dosDate: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    dosTime: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]+/g, "-").trim() || "proof";
}

function createHistoryEntry(
  batchId: string,
  action: ProofDownloadHistoryEntry["action"],
  performedByUserId: string,
  details: string,
  performedAt = new Date().toISOString(),
): ProofDownloadHistoryEntry {
  return {
    id: crypto.randomUUID(),
    batchId,
    action,
    performedByUserId,
    performedAt,
    details,
  };
}
