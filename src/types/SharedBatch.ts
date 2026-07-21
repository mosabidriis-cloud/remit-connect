export type SharedBatchAssignmentStatus =
  | "Unassigned"
  | "Assigned"
  | "In Branch Review"
  | "Completed";

export type SharedBatchTransactionStatus =
  | "Pending"
  | "Processing"
  | "Awaiting Proof"
  | "Completed";

export type SharedBatchTransaction = {
  id: number;
  reference: string;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  receiverBank: string;
  receiverAccountNumber: string;
  destinationCity: string;
  amount: number;
  currency: "SDG" | "USD";
  status: SharedBatchTransactionStatus;
};

export type SharedBatch = {
  id: number;
  batchCode: string;
  fileName: string;
  receivedAt: string;
  source: "Direct Remit Excel";
  transactionCount: number;
  totalAmount: number;
  currency: "SDG" | "USD";
  assignmentStatus: SharedBatchAssignmentStatus;
  assignedBranchId?: number;
  assignedBranchName?: string;
  assignedAt?: string;
  assignedBy?: string;
  notes: string;
  transactions: SharedBatchTransaction[];
};

export type SharedBatchProgressSummary = {
  totalBatches: number;
  unassignedBatches: number;
  assignedBatches: number;
  inBranchReviewBatches: number;
  completedBatches: number;
  totalTransactions: number;
};
