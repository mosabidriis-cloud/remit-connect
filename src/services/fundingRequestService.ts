import type { Branch } from "../types/Branch";
import type { FundingHistoryEntry, FundingRequest, FundingRequestStatus, FundingRequestSummary } from "../types/FundingRequest";

const EXCESS_SDG_THRESHOLD = 15_000_000;

const fundingRequests: FundingRequest[] = [
  {
    id: 1,
    branchId: 3,
    branchName: "Dongola Branch",
    requestedAmount: 5_000_000,
    currency: "SDG",
    status: "Pending",
    requestedAt: "2026-07-18 08:30",
    reference: "FR-1001",
  },
  {
    id: 2,
    branchId: 7,
    branchName: "Hasahessa Branch",
    requestedAmount: 3_500_000,
    currency: "SDG",
    status: "Sent",
    requestedAt: "2026-07-18 07:45",
    sentAt: "2026-07-18 08:00",
    reference: "FR-1002",
  },
  {
    id: 3,
    branchId: 10,
    branchName: "Kosti Branch",
    requestedAmount: 2_400_000,
    currency: "SDG",
    status: "Available",
    requestedAt: "2026-07-18 06:20",
    sentAt: "2026-07-18 06:35",
    receivedAt: "2026-07-18 06:40",
    confirmedAt: "2026-07-18 06:45",
    reference: "FR-1003",
    receivedAmount: 2_400_000,
  },
];

const fundingHistory: FundingHistoryEntry[] = [
  {
    id: 1,
    requestId: 3,
    branchId: 10,
    branchName: "Kosti Branch",
    status: "Available",
    timestamp: "2026-07-18 06:45",
    amount: 2_400_000,
    currency: "SDG",
    description: "Branch confirmed cash availability and liquidity updated",
  },
];

let branchLiquidityState: Record<number, number> = {
  1: 45_000_000,
  2: 18_000_000,
  3: 7_000_000,
  4: 36_000_000,
  5: 25_000_000,
  6: 52_000_000,
  7: 12_000_000,
  8: 30_000_000,
  9: 47_000_000,
  10: 9_000_000,
  11: 21_000_000,
  12: 41_000_000,
};

let branchPriorityScores: Record<number, number> = {
  1: 5,
  2: 4,
  3: 2,
  4: 6,
  5: 4,
  6: 7,
  7: 2,
  8: 5,
  9: 6,
  10: 2,
  11: 4,
  12: 5,
};

function getBranchLiquidity(branchId: number): number {
  return branchLiquidityState[branchId] ?? 0;
}

function getBranchPriorityScore(branchId: number): number {
  return branchPriorityScores[branchId] ?? 1;
}

function updateBranchLiquidity(branchId: number, amount: number) {
  branchLiquidityState[branchId] = getBranchLiquidity(branchId) + amount;
}

function updateBranchPriority(branchId: number, amount: number) {
  if (getBranchLiquidity(branchId) + amount > EXCESS_SDG_THRESHOLD) {
    branchPriorityScores[branchId] = getBranchPriorityScore(branchId) + 1;
  }
}

function addFundingHistoryEntry(request: FundingRequest, status: FundingRequestStatus, description: string) {
  fundingHistory.unshift({
    id: fundingHistory.length + 1,
    requestId: request.id,
    branchId: request.branchId,
    branchName: request.branchName,
    status,
    timestamp: new Date().toLocaleString("en-GB"),
    amount: request.requestedAmount,
    currency: "SDG",
    description,
  });
}

export function getFundingRequests(): FundingRequest[] {
  return fundingRequests;
}

export function getFundingHistory(): FundingHistoryEntry[] {
  return fundingHistory;
}

export function getFundingRequestSummary(): FundingRequestSummary {
  return {
    pendingRequests: fundingRequests.filter((request) => request.status === "Pending").length,
    availableRequests: fundingRequests.filter((request) => request.status === "Available").length,
    totalFundedAmount: fundingRequests
      .filter((request) => request.status === "Available")
      .reduce((sum, request) => sum + request.requestedAmount, 0),
    branchesWithExcessSdg: Object.values(branchLiquidityState).filter(
      (balance) => balance > EXCESS_SDG_THRESHOLD
    ).length,
  };
}

export function advanceFundingRequest(requestId: number, nextStatus: Exclude<FundingRequestStatus, "Pending" | "Cancelled">): FundingRequest | undefined {
  const request = fundingRequests.find((item) => item.id === requestId);

  if (!request || request.currency !== "SDG") {
    return undefined;
  }

  if (request.status === "Pending" && nextStatus === "Sent") {
    request.status = "Sent";
    request.sentAt = new Date().toLocaleString("en-GB");
    addFundingHistoryEntry(request, "Sent", "Treasury recorded and sent the funding request");
    return request;
  }

  if (request.status === "Sent" && nextStatus === "Received") {
    request.status = "Received";
    request.receivedAt = new Date().toLocaleString("en-GB");
    request.receivedAmount = request.requestedAmount;
    addFundingHistoryEntry(request, "Received", "Branch received the funding amount");
    return request;
  }

  if (request.status === "Received" && nextStatus === "Available") {
    request.status = "Available";
    request.confirmedAt = new Date().toLocaleString("en-GB");

    updateBranchLiquidity(request.branchId, request.requestedAmount);
    updateBranchPriority(request.branchId, request.requestedAmount);

    addFundingHistoryEntry(
      request,
      "Available",
      "Branch confirmed cash availability and liquidity was updated"
    );

    return request;
  }

  return undefined;
}

export function cancelFundingRequest(requestId: number): FundingRequest | undefined {
  const request = fundingRequests.find((item) => item.id === requestId);

  if (!request || request.currency !== "SDG") {
    return undefined;
  }

  request.status = "Cancelled";
  addFundingHistoryEntry(request, "Cancelled", "Funding request was cancelled");

  return request;
}

export function getBranchPrioritySnapshot(branchId: number) {
  return {
    branchId,
    priorityScore: getBranchPriorityScore(branchId),
    recommendedForOutwardAllocation:
      getBranchLiquidity(branchId) > EXCESS_SDG_THRESHOLD,
  };
}

export function getBranchLiquiditySnapshot(branchId: number) {
  return {
    branchId,
    sdgBalance: getBranchLiquidity(branchId),
    excessSdg: getBranchLiquidity(branchId) > EXCESS_SDG_THRESHOLD,
  };
}

export function getBranchState(branchId: number): Branch {
  return {
    id: branchId,
    code: "",
    name: "",
    manager: "",
    city: "",
    state: "",
    phone: "",
    availableAccounts: 0,
    filesReady: 0,
    status: "Ready",
    services: [],
    lastUpdated: "",
    active: true,
    liquidity: {
      usdBalance: 0,
      sdgBalance: getBranchLiquidity(branchId),
      liquidityLimit: 0,
      minimumThreshold: 0,
      availableLiquidity: getBranchLiquidity(branchId),
      health: "Healthy",
      isBelowThreshold: false,
      alertLevel: "None",
    },
  } as Branch;
}
