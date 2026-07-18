export type FundingRequestStatus = "Pending" | "Sent" | "Received" | "Available" | "Cancelled";

export interface FundingRequest {
  id: number;
  branchId: number;
  branchName: string;
  requestedAmount: number;
  sentAmount: number;
  receivedAmount: number;
  availableAmount: number;
  variance: number;
  currency: "SDG";
  status: FundingRequestStatus;
  requestedAt: string;
  sentAt?: string;
  receivedAt?: string;
  confirmedAt?: string;
  note?: string;
  reference: string;
}

export interface FundingHistoryEntry {
  id: number;
  requestId: number;
  branchId: number;
  branchName: string;
  status: FundingRequestStatus;
  timestamp: string;
  amount: number;
  currency: "SDG";
  description: string;
}

export interface FundingRequestSummary {
  pendingRequests: number;
  availableRequests: number;
  totalFundedAmount: number;
  branchesWithExcessSdg: number;
}

export interface FundingDashboardMetrics {
  totalRequestedToday: number;
  totalSentToday: number;
  outstandingRequests: number;
  fulfillmentRate: number;
}
