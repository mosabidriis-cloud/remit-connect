import type { Beneficiary } from "./beneficiary";

export interface Assignment {
  id: string;
  sharedBatchId: string;
  batchReference: string;
  assignedBranchId: string | null;
  assignedBranchName: string | null;
  assignedBy: string | null;
  assignedAt: string | null;
  readyTransactionCount: number;
  manualReviewCount: number;
  invalidCount: number;
  assignedTransactions: Beneficiary[];
  manualReviewTransactions: Beneficiary[];
  invalidTransactions: Beneficiary[];
  status: "PENDING" | "ASSIGNED";
}
