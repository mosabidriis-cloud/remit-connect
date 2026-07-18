export type TreasuryApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface TreasuryRequest {
  id: number;
  branchId: number;
  branchName: string;
  requestedAmount: number;
  currency: string;
  reason: string;
  requestedAt: string;
  status: TreasuryApprovalStatus;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface FundingHistoryEntry {
  id: number;
  branchId: number;
  branchName: string;
  amount: number;
  currency: string;
  status: TreasuryApprovalStatus;
  executedAt: string;
  reference: string;
}
