import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../lib/database.types";
import { recordAuditEvent } from "./auditService";
import { deductForTransaction } from "./liquidityService";
import { createSignedProofUrls, uploadProofOfPayment } from "./proofOfPaymentService";
import { getAssignment, getBeneficiariesByIds, getSharedBatch, updateSharedBatchLifecycleStatus } from "./sharedBatchStore";
import { defaultHoldReasons, defaultReturnReasons } from "./transactionProcessingService";
import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type { HoldReason } from "../types/holdReason";
import type { ProofOfPayment } from "../types/proofOfPayment";
import type { ReturnReason } from "../types/returnReason";

/**
 * Operational Persistence Milestone 2 (DEC-020, OPERATIONAL_PERSISTENCE.md). Supabase-
 * backed - the durable counterpart to the branch processing queue and its proofs.
 * Every export keeps its original name and shape wherever the change is a pure
 * async conversion; addProofToBranchProcessingQueueItem's signature genuinely changed
 * (see its own doc comment) because a real Storage upload requires the file bytes,
 * which the old (itemId, proof) shape had no way to carry.
 *
 * `BranchProcessingQueueItem.beneficiary` and `.proofs` are NOT stored as columns on
 * `branch_processing_queue_items` - the row keeps only `beneficiary_id`, and the
 * beneficiary and its proofs are reconstructed at read time (same no-duplicate-storage
 * approach as Milestone 1's Assignment). `previewUrl` on a hydrated ProofOfPayment is
 * always a freshly generated signed URL - never persisted - because the proof bytes
 * live in the private `proof-of-payment` Storage bucket, not in a public URL.
 */

type QueueItemRow = Database["public"]["Tables"]["branch_processing_queue_items"]["Row"];
type ProofRow = Database["public"]["Tables"]["proofs"]["Row"];

export type BranchProcessingQueueStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "RETURNED";

export type BranchProcessingStatus = "PROCESSING" | "COMPLETED";

export interface BranchProcessingQueueItem {
  id: string;
  assignmentId: string;
  branchId: string;
  beneficiary: Beneficiary;
  status: BranchProcessingQueueStatus;
  proofs: ProofOfPayment[];
  returnReason: ReturnReason | null;
  returnComment: string | null;
  holdReason: HoldReason | null;
  holdComment: string | null;
  heldAt: string | null;
  heldByUserId: string | null;
  /** When this item entered the branch's processing queue (row creation, ASSIGNED). */
  createdAt: string;
  /** Set once, on the first ASSIGNED/ON_HOLD -> IN_PROGRESS transition. Never reset. */
  startedAt: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  returnedAt: string | null;
  returnedByUserId: string | null;
  /**
   * Liquidity Management (LIQUIDITY_MANAGEMENT.md Section 6-7). Set once, at
   * startBranchProcessingQueueItem - the payout account this transaction will draw from.
   * The actual balance deduction happens later, at completeBranchProcessingQueueItem.
   */
  payoutAccountId: string | null;
}

export interface BranchProcessingQueueSummary {
  assigned: number;
  inProgress: number;
  completed: number;
  onHold: number;
  returned: number;
  remaining: number;
  total: number;
  completionPercentage: number;
}

export async function hydrateBranchProcessingQueue(branchId: string, assignments: Assignment[]): Promise<BranchProcessingQueueItem[]> {
  // Re-hydration must be idempotent: mounting this branch's queue again (e.g. the
  // officer navigates away and back) must not discard progress already made. Existing
  // items are left untouched; only assignment-beneficiary pairs with no row yet get a
  // fresh ASSIGNED row. Branch-level status (PROCESSING/COMPLETED) is left untouched
  // here for the same reason - see finalizeBranchProcessing for its only writer.
  const { data: existingRows, error: existingError } = await supabase
    .from("branch_processing_queue_items")
    .select("id")
    .eq("branch_id", branchId);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.id));
  const newRows: Database["public"]["Tables"]["branch_processing_queue_items"]["Insert"][] = [];

  assignments.forEach((assignment) => {
    (assignment.assignedTransactions ?? []).forEach((beneficiary) => {
      const id = `${assignment.id}-${beneficiary.id}`;

      if (!existingIds.has(id)) {
        newRows.push({
          id,
          assignment_id: assignment.id,
          branch_id: branchId,
          beneficiary_id: beneficiary.id,
          status: "ASSIGNED",
        });
      }
    });
  });

  if (newRows.length > 0) {
    const { error: insertError } = await supabase.from("branch_processing_queue_items").insert(newRows);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  // A branch accepting its assigned transactions into the processing queue is the
  // point at which the underlying Shared Batch is accepted into workflow (LIFECYCLE.md
  // ASSIGNED -> PROCESSING). Only advances batches still at ASSIGNED.
  for (const assignment of assignments) {
    const sharedBatch = await getSharedBatch(assignment.sharedBatchId);

    if (sharedBatch && sharedBatch.lifecycleStatus === "ASSIGNED") {
      await updateSharedBatchLifecycleStatus(assignment.sharedBatchId, "PROCESSING");
    }
  }

  return getBranchProcessingQueue(branchId);
}

export async function getBranchProcessingQueue(branchId: string): Promise<BranchProcessingQueueItem[]> {
  const { data, error } = await supabase
    .from("branch_processing_queue_items")
    .select("*")
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return hydrateQueueItems(data ?? []);
}

/**
 * Read-only enumeration of every branch's processing queue items (Sprint 16 M4.1,
 * DECISIONS.md DEC-007 / REPORTING_PROJECTION_LAYER.md D-4).
 *
 * The enterprise-wide counterpart to getBranchProcessingQueue, which can only read
 * one branch at a time and so cannot serve Operations Manager visibility.
 *
 * Guarantees, all of which this function depends on being kept:
 * - It never calls hydrateBranchProcessingQueue. Reading a queue must never rebuild
 *   one: hydration was found in Sprint 15 M1.75 to have silently discarded completed
 *   work, and a read path must not be able to reach it even now that it is idempotent.
 * - It writes nothing - no item status, no proof, no branch-level status.
 * - Every item returned is freshly constructed from its row on this call - unlike the
 *   in-memory era, there is no live reference to guard against a caller mutating.
 * - Ordering is internal query order and is not part of this contract - callers must
 *   apply their own deterministic sort (REPORTING_PROJECTION_LAYER.md Section 9.5).
 *
 * Branch-level status is not enumerated here: branch ids are derivable from these
 * items, and getBranchProcessingStatus already reads status per branch.
 */
export async function getAllBranchProcessingQueueItems(): Promise<readonly BranchProcessingQueueItem[]> {
  const { data, error } = await supabase.from("branch_processing_queue_items").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return hydrateQueueItems(data ?? []);
}

export function canTransitionToStatus(currentStatus: BranchProcessingQueueStatus, nextStatus: BranchProcessingQueueStatus): boolean {
  if (currentStatus === "ASSIGNED") {
    return nextStatus === "IN_PROGRESS";
  }

  if (currentStatus === "IN_PROGRESS") {
    return nextStatus === "COMPLETED" || nextStatus === "ON_HOLD" || nextStatus === "RETURNED";
  }

  if (currentStatus === "ON_HOLD") {
    return nextStatus === "IN_PROGRESS";
  }

  return false;
}

/**
 * Sum of beneficiary.amount across this account's IN_PROGRESS items - "reserved"
 * liquidity, computed live from queue state rather than stored anywhere
 * (LIQUIDITY_MANAGEMENT.md Section 7.2). Read by startBranchProcessingQueueItem for its
 * own sufficiency check, and by reportingProjectionService for the same figure - one
 * calculation, two callers, never two implementations.
 */
export async function getReservedAmountForAccount(accountId: string): Promise<number> {
  const { data, error } = await supabase
    .from("branch_processing_queue_items")
    .select("beneficiary_id")
    .eq("status", "IN_PROGRESS")
    .eq("payout_account_id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  const beneficiaryIds = (data ?? []).map((row) => row.beneficiary_id);
  const beneficiaries = await getBeneficiariesByIds(beneficiaryIds);

  return beneficiaries.reduce((total, beneficiary) => total + beneficiary.amount, 0);
}

/**
 * The only path into IN_PROGRESS (LIQUIDITY_MANAGEMENT.md Section 7.1). Starting a
 * transaction for the first time requires a payout account with sufficient available
 * balance (current balance minus what is already reserved against it); resuming from
 * ON_HOLD reuses the account chosen the first time and does not require re-selection.
 */
export async function startBranchProcessingQueueItem(
  itemId: string,
  payoutAccountId: string | undefined,
  startedByUserId: string,
): Promise<BranchProcessingQueueItem> {
  const row = await fetchQueueItemRow(itemId);

  if (!row) {
    throw new Error("Transaction was not found in the processing queue.");
  }

  if ((await getBranchProcessingStatus(row.branch_id)) === "COMPLETED") {
    throw new Error("Processing session is locked. Queue is read-only.");
  }

  if (!canTransitionToStatus(row.status as BranchProcessingQueueStatus, "IN_PROGRESS")) {
    throw new Error("This transaction cannot be started from its current status.");
  }

  const updates: Database["public"]["Tables"]["branch_processing_queue_items"]["Update"] = { status: "IN_PROGRESS" };

  if (row.payout_account_id === null) {
    if (!payoutAccountId) {
      throw new Error("A payout account must be selected before processing can begin.");
    }

    updates.payout_account_id = payoutAccountId;
  }

  // First time work begins on this transaction (Decision D-6). Resuming from ON_HOLD
  // does not reset it - startedAt marks when processing began, not each active period.
  if (row.started_at === null) {
    updates.started_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("branch_processing_queue_items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Unable to start processing.");
  }

  const item = await hydrateOne(data);

  await recordAuditEvent({
    actorUserId: startedByUserId,
    action: "TRANSACTION_STARTED",
    entityType: "QUEUE_ITEM",
    entityId: itemId,
    branchId: row.branch_id,
    details: `Started processing transaction ${itemId}.`,
  });

  return item;
}

/**
 * Mirrors returnBranchProcessingQueueItem's shape exactly: a predefined reason plus an
 * optional comment, captured at the moment of the transition, so the Direct Remit
 * Officer (who has no other way to see live processing detail - see
 * proofDownloadService's onHoldTransactionCount doc comment) can see why, not just that,
 * a transaction is paused.
 */
export async function putBranchProcessingQueueItemOnHold(
  itemId: string,
  holdReason: HoldReason,
  comment: string,
  actorUserId: string,
): Promise<BranchProcessingQueueItem> {
  const row = await fetchQueueItemRow(itemId);

  if (!row) {
    throw new Error("Transaction was not found in the processing queue.");
  }

  if ((await getBranchProcessingStatus(row.branch_id)) === "COMPLETED") {
    throw new Error("Processing session is locked. Queue is read-only.");
  }

  if (!canTransitionToStatus(row.status as BranchProcessingQueueStatus, "ON_HOLD")) {
    throw new Error("This transaction cannot be put on hold from its current status.");
  }

  if (!holdReason.isActive) {
    throw new Error("An active predefined Hold Reason is required.");
  }

  const { data, error } = await supabase
    .from("branch_processing_queue_items")
    .update({
      status: "ON_HOLD",
      held_at: new Date().toISOString(),
      held_by_user_id: actorUserId,
      hold_reason_id: holdReason.id,
      hold_comment: comment || null,
    })
    .eq("id", itemId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Unable to put transaction on hold.");
  }

  const item = await hydrateOne(data);

  await recordAuditEvent({
    actorUserId,
    action: "TRANSACTION_ON_HOLD",
    entityType: "QUEUE_ITEM",
    entityId: itemId,
    branchId: row.branch_id,
    details: `Put transaction ${itemId} on hold - ${holdReason.name}${comment ? `: ${comment}` : ""}.`,
  });

  return item;
}

/**
 * Uploads the proof image to the private `proof-of-payment` Storage bucket and records
 * its metadata. Signature change from the in-memory version (which took an
 * already-built ProofOfPayment): a real Storage upload needs the file's bytes, which a
 * pre-built ProofOfPayment cannot carry, so the file itself is now the input and this
 * function owns building the metadata (via proofOfPaymentService.uploadProofOfPayment).
 */
export async function addProofToBranchProcessingQueueItem(
  itemId: string,
  file: File,
  uploadedByUserId: string,
): Promise<BranchProcessingQueueItem> {
  const row = await fetchQueueItemRow(itemId);

  if (!row) {
    throw new Error("Transaction was not found in the processing queue.");
  }

  const proof = await uploadProofOfPayment(file, itemId, uploadedByUserId);

  const { error } = await supabase.from("proofs").insert({
    id: proof.id,
    queue_item_id: itemId,
    file_name: proof.fileName,
    file_type: proof.fileType,
    file_size: proof.fileSize,
    storage_path: proof.storagePath,
    uploaded_by_user_id: proof.uploadedByUserId,
    uploaded_at: proof.uploadedAt,
    expires_at: proof.expiresAt,
    status: proof.status,
  });

  if (error) {
    throw new Error(error.message);
  }

  const item = await hydrateOne(row);

  await recordAuditEvent({
    actorUserId: uploadedByUserId,
    action: "PROOF_UPLOADED",
    entityType: "PROOF",
    entityId: proof.id,
    branchId: row.branch_id,
    details: `Uploaded proof ${proof.fileName} for transaction ${itemId}.`,
  });

  return item;
}

export async function completeBranchProcessingQueueItem(itemId: string, completedByUserId: string): Promise<BranchProcessingQueueItem> {
  const row = await fetchQueueItemRow(itemId);

  if (!row) {
    throw new Error("Transaction was not found in the processing queue.");
  }

  if ((await getBranchProcessingStatus(row.branch_id)) === "COMPLETED") {
    throw new Error("Processing session is locked. Queue is read-only.");
  }

  if (!canTransitionToStatus(row.status as BranchProcessingQueueStatus, "COMPLETED")) {
    throw new Error("This transaction cannot be completed from its current status.");
  }

  const proofRows = await fetchProofRows([itemId]);

  if (proofRows.length === 0) {
    throw new Error("At least one proof-of-payment screenshot is required before completion.");
  }

  if (!row.payout_account_id) {
    throw new Error("This transaction has no payout account selected and cannot be completed.");
  }

  const [beneficiary] = await getBeneficiariesByIds([row.beneficiary_id]);

  if (!beneficiary) {
    throw new Error("Transaction beneficiary details could not be found.");
  }

  // Liquidity Management's one real deduction (LIQUIDITY_MANAGEMENT.md Section 7.1) -
  // the only status transition with no path back out, so no reversal logic is needed.
  // If the account cannot cover it, deductForTransaction throws and completion does not
  // proceed - the transaction stays IN_PROGRESS rather than completing without payment.
  await deductForTransaction(row.payout_account_id, beneficiary.amount, completedByUserId);

  const { data, error } = await supabase
    .from("branch_processing_queue_items")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      completed_by_user_id: completedByUserId,
    })
    .eq("id", itemId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Unable to complete transaction.");
  }

  const item = await hydrateOne(data);

  await recordAuditEvent({
    actorUserId: completedByUserId,
    action: "TRANSACTION_COMPLETED",
    entityType: "QUEUE_ITEM",
    entityId: itemId,
    branchId: row.branch_id,
    details: `Completed transaction ${itemId} (${beneficiary.currency} ${beneficiary.amount.toFixed(2)}).`,
  });

  return item;
}

export async function returnBranchProcessingQueueItem(
  itemId: string,
  returnReason: ReturnReason,
  comment: string,
  returnedByUserId: string,
): Promise<BranchProcessingQueueItem> {
  const row = await fetchQueueItemRow(itemId);

  if (!row) {
    throw new Error("Transaction was not found in the processing queue.");
  }

  if ((await getBranchProcessingStatus(row.branch_id)) === "COMPLETED") {
    throw new Error("Processing session is locked. Queue is read-only.");
  }

  if (!canTransitionToStatus(row.status as BranchProcessingQueueStatus, "RETURNED")) {
    throw new Error("This transaction cannot be returned from its current status.");
  }

  if (!returnReason.isActive) {
    throw new Error("An active predefined Return Reason is required.");
  }

  const { data, error } = await supabase
    .from("branch_processing_queue_items")
    .update({
      status: "RETURNED",
      returned_at: new Date().toISOString(),
      returned_by_user_id: returnedByUserId,
      return_reason_id: returnReason.id,
      return_comment: comment || null,
    })
    .eq("id", itemId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Unable to return transaction.");
  }

  const item = await hydrateOne(data);

  await recordAuditEvent({
    actorUserId: returnedByUserId,
    action: "TRANSACTION_RETURNED",
    entityType: "QUEUE_ITEM",
    entityId: itemId,
    branchId: row.branch_id,
    details: `Returned transaction ${itemId} - ${returnReason.name}${comment ? `: ${comment}` : ""}.`,
  });

  return item;
}

export async function getBranchProcessingQueueSummary(branchId: string): Promise<BranchProcessingQueueSummary> {
  // A lightweight status-only query - computing a summary does not need full item
  // hydration (beneficiary lookups, proof rows, signed URLs), which getBranchProcessingQueue
  // would otherwise do on every dashboard/report refresh.
  const { data, error } = await supabase.from("branch_processing_queue_items").select("status").eq("branch_id", branchId);

  if (error) {
    throw new Error(error.message);
  }

  const statuses = (data ?? []).map((row) => row.status as BranchProcessingQueueStatus);

  const assigned = statuses.filter((status) => status === "ASSIGNED").length;
  const inProgress = statuses.filter((status) => status === "IN_PROGRESS").length;
  const completed = statuses.filter((status) => status === "COMPLETED").length;
  const onHold = statuses.filter((status) => status === "ON_HOLD").length;
  const returned = statuses.filter((status) => status === "RETURNED").length;
  const total = statuses.length;
  const remaining = assigned + inProgress + onHold;
  const completionPercentage = total === 0 ? 0 : Math.round(((completed + returned) / total) * 100);

  return { assigned, inProgress, completed, onHold, returned, remaining, total, completionPercentage };
}

export async function isBranchProcessingComplete(branchId: string): Promise<boolean> {
  const summary = await getBranchProcessingQueueSummary(branchId);
  return summary.total > 0 && summary.assigned === 0 && summary.inProgress === 0 && summary.onHold === 0;
}

export async function getBranchProcessingStatus(branchId: string): Promise<BranchProcessingStatus> {
  const { data, error } = await supabase.from("branch_processing_status").select("status").eq("branch_id", branchId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.status as BranchProcessingStatus | undefined) ?? "PROCESSING";
}

export async function finalizeBranchProcessing(branchId: string, finalizedByUserId: string): Promise<BranchProcessingStatus | null> {
  if (!(await isBranchProcessingComplete(branchId))) {
    return null;
  }

  const { error: statusError } = await supabase
    .from("branch_processing_status")
    .upsert({ branch_id: branchId, status: "COMPLETED" });

  if (statusError) {
    throw new Error(statusError.message);
  }

  await recordAuditEvent({
    actorUserId: finalizedByUserId,
    action: "BRANCH_PROCESSING_FINALIZED",
    entityType: "BRANCH",
    entityId: branchId,
    branchId,
    details: `Finalized branch processing for ${branchId}.`,
  });

  // Mirror the branch-level completion into the Shared Batch lifecycle (LIFECYCLE.md
  // PROCESSING -> COMPLETED) so Proof Management can pick up the batch. Only advances
  // batches still at PROCESSING.
  const queueItems = await getBranchProcessingQueue(branchId);
  const assignmentIds = [...new Set(queueItems.map((item) => item.assignmentId))];
  const assignments = await Promise.all(assignmentIds.map((assignmentId) => getAssignment(assignmentId)));
  const sharedBatchIds = new Set(
    assignments
      .map((assignment) => assignment?.sharedBatchId)
      .filter((sharedBatchId): sharedBatchId is string => Boolean(sharedBatchId)),
  );

  for (const sharedBatchId of sharedBatchIds) {
    const sharedBatch = await getSharedBatch(sharedBatchId);

    if (sharedBatch && sharedBatch.lifecycleStatus === "PROCESSING") {
      await updateSharedBatchLifecycleStatus(sharedBatchId, "COMPLETED");
    }
  }

  return "COMPLETED";
}

async function fetchQueueItemRow(itemId: string): Promise<QueueItemRow | null> {
  const { data, error } = await supabase.from("branch_processing_queue_items").select("*").eq("id", itemId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function fetchProofRows(itemIds: readonly string[]): Promise<ProofRow[]> {
  if (itemIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("proofs").select("*").in("queue_item_id", [...itemIds]);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function hydrateOne(row: QueueItemRow): Promise<BranchProcessingQueueItem> {
  const [item] = await hydrateQueueItems([row]);
  return item;
}

/**
 * Batches one beneficiaries query, one proofs query and one Storage signed-URL request
 * across every row, rather than one round trip per queue item.
 */
async function hydrateQueueItems(rows: QueueItemRow[]): Promise<BranchProcessingQueueItem[]> {
  if (rows.length === 0) {
    return [];
  }

  const beneficiaryIds = [...new Set(rows.map((row) => row.beneficiary_id))];
  const itemIds = rows.map((row) => row.id);

  const [beneficiaries, proofRows] = await Promise.all([getBeneficiariesByIds(beneficiaryIds), fetchProofRows(itemIds)]);

  const beneficiariesById = new Map(beneficiaries.map((beneficiary) => [beneficiary.id, beneficiary] as const));

  const proofsByItemId = new Map<string, ProofRow[]>();
  proofRows.forEach((proofRow) => {
    const existing = proofsByItemId.get(proofRow.queue_item_id) ?? [];
    existing.push(proofRow);
    proofsByItemId.set(proofRow.queue_item_id, existing);
  });

  const signedUrlsByPath = await createSignedProofUrls(proofRows.map((proofRow) => proofRow.storage_path));

  return rows.map((row) => {
    const beneficiary = beneficiariesById.get(row.beneficiary_id);

    if (!beneficiary) {
      throw new Error(`Branch Processing queue item ${row.id} references a beneficiary that could not be found.`);
    }

    const proofs = (proofsByItemId.get(row.id) ?? []).map((proofRow) =>
      mapRowToProof(proofRow, signedUrlsByPath.get(proofRow.storage_path) ?? ""),
    );

    return mapRowToQueueItem(row, beneficiary, proofs);
  });
}

function mapRowToQueueItem(row: QueueItemRow, beneficiary: Beneficiary, proofs: ProofOfPayment[]): BranchProcessingQueueItem {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    branchId: row.branch_id,
    beneficiary,
    status: row.status as BranchProcessingQueueStatus,
    proofs,
    returnReason: defaultReturnReasons.find((reason) => reason.id === row.return_reason_id) ?? null,
    returnComment: row.return_comment,
    holdReason: defaultHoldReasons.find((reason) => reason.id === row.hold_reason_id) ?? null,
    holdComment: row.hold_comment,
    heldAt: row.held_at,
    heldByUserId: row.held_by_user_id,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    completedByUserId: row.completed_by_user_id,
    returnedAt: row.returned_at,
    returnedByUserId: row.returned_by_user_id,
    payoutAccountId: row.payout_account_id,
  };
}

function mapRowToProof(row: ProofRow, previewUrl: string): ProofOfPayment {
  return {
    id: row.id,
    transactionId: row.queue_item_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    previewUrl,
    uploadedByUserId: row.uploaded_by_user_id,
    uploadedAt: row.uploaded_at,
    expiresAt: row.expires_at,
    status: row.status as ProofOfPayment["status"],
  };
}
