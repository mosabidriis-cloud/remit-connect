import type { FundingHistoryEntry, TreasuryRequest } from "../types/Treasury";

const treasuryRequests: TreasuryRequest[] = [
  {
    id: 1,
    branchId: 3,
    branchName: "Dongola Branch",
    requestedAmount: 5000000,
    currency: "SDG",
    reason: "Urgent liquidity support for cash pickup operations",
    requestedAt: "2026-07-18 08:30",
    status: "Pending",
    requestedBy: "Yasir Ibrahim",
  },
  {
    id: 2,
    branchId: 7,
    branchName: "Hasahessa Branch",
    requestedAmount: 3500000,
    currency: "SDG",
    reason: "Funding for weekend branch demand",
    requestedAt: "2026-07-18 07:45",
    status: "Pending",
    requestedBy: "Nadia Salim",
  },
  {
    id: 3,
    branchId: 10,
    branchName: "Kosti Branch",
    requestedAmount: 2400000,
    currency: "SDG",
    reason: "Short-term liquidity coverage",
    requestedAt: "2026-07-18 06:20",
    status: "Approved",
    requestedBy: "Bakri Abu",
    approvedBy: "Treasury Team",
    approvedAt: "2026-07-18 06:35",
  },
];

const fundingHistory: FundingHistoryEntry[] = [
  {
    id: 1,
    branchId: 10,
    branchName: "Kosti Branch",
    amount: 2400000,
    currency: "SDG",
    status: "Approved",
    executedAt: "2026-07-18 06:35",
    reference: "TR-240001",
  },
  {
    id: 2,
    branchId: 4,
    branchName: "Kassala Branch",
    amount: 1800000,
    currency: "SDG",
    status: "Approved",
    executedAt: "2026-07-18 05:10",
    reference: "TR-240002",
  },
  {
    id: 3,
    branchId: 6,
    branchName: "Alwady Branch",
    amount: 1200000,
    currency: "USD",
    status: "Rejected",
    executedAt: "2026-07-17 22:40",
    reference: "TR-240003",
  },
];

export function getTreasuryRequests(): TreasuryRequest[] {
  return treasuryRequests;
}

export function getFundingHistory(): FundingHistoryEntry[] {
  return fundingHistory;
}

export function getTreasurySummary() {
  return {
    pendingRequests: treasuryRequests.filter((request) => request.status === "Pending").length,
    approvedRequests: treasuryRequests.filter((request) => request.status === "Approved").length,
    rejectedRequests: treasuryRequests.filter((request) => request.status === "Rejected").length,
    totalRequestedAmount: treasuryRequests.reduce(
      (sum, request) => sum + request.requestedAmount,
      0
    ),
  };
}

export function approveTreasuryRequest(requestId: number): TreasuryRequest | undefined {
  const request = treasuryRequests.find((item) => item.id === requestId);

  if (!request) {
    return undefined;
  }

  request.status = "Approved";
  request.approvedBy = "Treasury Team";
  request.approvedAt = new Date().toLocaleString("en-GB");

  fundingHistory.unshift({
    id: fundingHistory.length + 1,
    branchId: request.branchId,
    branchName: request.branchName,
    amount: request.requestedAmount,
    currency: request.currency,
    status: "Approved",
    executedAt: request.approvedAt,
    reference: `TR-${100000 + fundingHistory.length + 1}`,
  });

  return request;
}

export function rejectTreasuryRequest(requestId: number): TreasuryRequest | undefined {
  const request = treasuryRequests.find((item) => item.id === requestId);

  if (!request) {
    return undefined;
  }

  request.status = "Rejected";
  request.approvedBy = "Treasury Team";
  request.approvedAt = new Date().toLocaleString("en-GB");

  fundingHistory.unshift({
    id: fundingHistory.length + 1,
    branchId: request.branchId,
    branchName: request.branchName,
    amount: request.requestedAmount,
    currency: request.currency,
    status: "Rejected",
    executedAt: request.approvedAt,
    reference: `TR-${100000 + fundingHistory.length + 1}`,
  });

  return request;
}
