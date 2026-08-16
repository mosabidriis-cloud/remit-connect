export type PayoutAccountStatus = "ACTIVE" | "INACTIVE";

export interface PayoutAccount {
  id: string;
  branchId: string;
  bank: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  minimumThreshold: number;
  status: PayoutAccountStatus;
  lastUpdatedAt: string;
  lastUpdatedByUserId: string;
}

export interface FundingEntry {
  accountId: string;
  previousBalance: number;
  fundingAmount: number;
  newBalance: number;
}

export interface FundingEvent {
  id: string;
  branchId: string;
  entries: FundingEntry[];
  totalAmount: number;
  updatedByUserId: string;
  updatedAt: string;
  reference: string | null;
  notes: string | null;
}
