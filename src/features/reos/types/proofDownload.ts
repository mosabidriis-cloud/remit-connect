import type { ProofOfPayment } from "./proofOfPayment";
import type { SharedBatchLifecycleStatus } from "./sharedBatch";
import type { CreditToAccountTransaction } from "./transactionProcessing";

export type ProofDownloadActorRole =
  | "DIRECT_REMIT_OFFICER"
  | "OPERATIONS_MANAGER";

export interface ProofDownloadBatch {
  id: string;
  sharedBatchReference: string;
  directRemitBatchReference: string;
  assignedBranchId: string;
  lifecycleStatus: SharedBatchLifecycleStatus;
  transactions: CreditToAccountTransaction[];
  completedByUserId: string | null;
  completedAt: string | null;
  downloadedByUserId: string | null;
  downloadedAt: string | null;
}

export interface BatchDownloadSummary {
  sharedBatchReference: string;
  directRemitBatchReference: string;
  assignedBranchId: string;
  transactionCount: number;
  proofImageCount: number;
  completedTransactionCount: number;
  returnedTransactionCount: number;
  processingStatus: SharedBatchLifecycleStatus;
  downloadStatus: Extract<SharedBatchLifecycleStatus, "READY_FOR_DOWNLOAD" | "DOWNLOADED">;
  completedByUserId: string | null;
  completedAt: string | null;
  downloadedByUserId: string | null;
  downloadedAt: string | null;
}

export interface ProofDownloadHistoryEntry {
  id: string;
  batchId: string;
  action: "ZIP_DOWNLOADED" | "PROOF_DOWNLOADED" | "BATCH_MARKED_DOWNLOADED";
  performedByUserId: string;
  performedAt: string;
  details: string;
}

export interface MarkBatchDownloadedInput {
  batch: ProofDownloadBatch;
  actorUserId: string;
  actorRole: ProofDownloadActorRole;
}

export interface ProofDownloadRequest {
  batch: ProofDownloadBatch;
  actorUserId: string;
  actorRole: ProofDownloadActorRole;
}

export interface DownloadableProof {
  transactionId: string;
  directRemitReference: string;
  proof: ProofOfPayment;
}
