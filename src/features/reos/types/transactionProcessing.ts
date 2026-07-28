import type { Beneficiary } from "./beneficiary";
import type { ProofOfPayment } from "./proofOfPayment";
import type { ReturnReason } from "./returnReason";

export type CreditToAccountTransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "RETURNED";

export type TransactionAuditAction =
  | "PROOF_UPLOADED"
  | "TRANSACTION_COMPLETED"
  | "TRANSACTION_RETURNED";

export interface CreditToAccountTransaction {
  id: string;
  beneficiary: Beneficiary;
  status: CreditToAccountTransactionStatus;
  proofs: ProofOfPayment[];
  completedByUserId: string | null;
  completedAt: string | null;
  returnedByUserId: string | null;
  returnedAt: string | null;
  returnReason: ReturnReason | null;
  returnComment: string | null;
}

export interface BranchProcessingBatch {
  id: string;
  reference: string;
  assignedBranchId: string;
  totalTransactions: number;
  currentPosition: number;
  transactions: CreditToAccountTransaction[];
}

export interface TransactionProcessingAudit {
  id: string;
  transactionId: string;
  action: TransactionAuditAction;
  performedByUserId: string;
  performedAt: string;
  details: string;
}

export interface ReturnTransactionInput {
  transaction: CreditToAccountTransaction;
  returnReason: ReturnReason;
  comment: string;
  returnedByUserId: string;
}
