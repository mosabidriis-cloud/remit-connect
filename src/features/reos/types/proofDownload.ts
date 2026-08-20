import type { HoldReason } from "./holdReason";
import type { ProofOfPayment } from "./proofOfPayment";
import type { SharedBatchLifecycleStatus } from "./sharedBatch";
import type { CreditToAccountTransaction } from "./transactionProcessing";

export type ProofDownloadActorRole =
  | "DIRECT_REMIT_OFFICER"
  | "OPERATIONS_MANAGER";

/** Sourced from the real BranchProcessingQueueStatus, not `transactions` below - see the doc comment on buildProofDownloadBatchFromSharedBatch. */
export interface OnHoldTransaction {
  transactionId: string;
  directRemitReference: string;
  beneficiaryName: string;
  holdReason: HoldReason | null;
  holdComment: string | null;
  heldAt: string | null;
}

export interface ProofDownloadBatch {
  id: string;
  sharedBatchReference: string;
  assignedBranchId: string;
  lifecycleStatus: SharedBatchLifecycleStatus;
  transactions: CreditToAccountTransaction[];
  onHoldTransactions: OnHoldTransaction[];
  downloadedByUserId: string | null;
  downloadedAt: string | null;
}

export interface BatchDownloadSummary {
  sharedBatchReference: string;
  assignedBranchId: string;
  transactionCount: number;
  proofImageCount: number;
  completedTransactionCount: number;
  returnedTransactionCount: number;
  onHoldTransactionCount: number;
  lifecycleStatus: SharedBatchLifecycleStatus;
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
  beneficiaryName: string;
  currency: string;
  amount: number;
  proof: ProofOfPayment;
}
