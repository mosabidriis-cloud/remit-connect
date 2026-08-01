import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type { ProofOfPayment } from "../types/proofOfPayment";
import type { ReturnReason } from "../types/returnReason";

export type BranchProcessingQueueStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "RETURNED";

export type BranchProcessingStatus = "PROCESSING" | "COMPLETED";

export interface BranchProcessingQueueItem {
  id: string;
  assignmentId: string;
  branchId: string;
  beneficiary: Beneficiary;
  status: BranchProcessingQueueStatus;
  proofs: ProofOfPayment[];
  returnReason: ReturnReason | null;
  returnComment: string | null;
}

export interface BranchProcessingQueueSummary {
  assigned: number;
  inProgress: number;
  completed: number;
  onHold: number;
  returned: number;
  remaining: number;
  total: number;
  completionPercentage: number;
}

const branchProcessingQueueState: BranchProcessingQueueItem[] = [];
const branchProcessingStatusState = new Map<string, BranchProcessingStatus>();

export function hydrateBranchProcessingQueue(branchId: string, assignments: Assignment[]) {
  const nextItems = assignments.flatMap((assignment) =>
    (assignment.assignedTransactions ?? []).map((beneficiary) => ({
      id: `${assignment.id}-${beneficiary.id}`,
      assignmentId: assignment.id,
      branchId,
      beneficiary,
      status: "ASSIGNED" as BranchProcessingQueueStatus,
      proofs: [] as ProofOfPayment[],
      returnReason: null as ReturnReason | null,
      returnComment: null as string | null,
    })),
  );

  const otherBranchItems = branchProcessingQueueState.filter((item) => item.branchId !== branchId);
  branchProcessingQueueState.splice(0, branchProcessingQueueState.length, ...otherBranchItems, ...nextItems);
  branchProcessingStatusState.delete(branchId);
  return getBranchProcessingQueue(branchId);
}

export function getBranchProcessingQueue(branchId: string): BranchProcessingQueueItem[] {
  return branchProcessingQueueState.filter((item) => item.branchId === branchId);
}

export function canTransitionToStatus(currentStatus: BranchProcessingQueueStatus, nextStatus: BranchProcessingQueueStatus): boolean {
  if (currentStatus === "ASSIGNED") {
    return nextStatus === "IN_PROGRESS";
  }

  if (currentStatus === "IN_PROGRESS") {
    return nextStatus === "COMPLETED" || nextStatus === "ON_HOLD" || nextStatus === "RETURNED";
  }

  if (currentStatus === "ON_HOLD") {
    return nextStatus === "IN_PROGRESS";
  }

  return false;
}

export function updateBranchProcessingQueueItemStatus(itemId: string, status: BranchProcessingQueueStatus) {
  const matchingItem = branchProcessingQueueState.find((item) => item.id === itemId);

  if (!matchingItem) {
    return null;
  }

  // COMPLETED and RETURNED require proof/return-reason gating and can only be
  // reached through completeBranchProcessingQueueItem / returnBranchProcessingQueueItem.
  if (status === "COMPLETED" || status === "RETURNED") {
    return matchingItem;
  }

  if (getBranchProcessingStatus(matchingItem.branchId) === "COMPLETED") {
    return matchingItem;
  }

  if (!canTransitionToStatus(matchingItem.status, status)) {
    return matchingItem;
  }

  matchingItem.status = status;
  return matchingItem;
}

export function addProofToBranchProcessingQueueItem(itemId: string, proof: ProofOfPayment): BranchProcessingQueueItem {
  const matchingItem = branchProcessingQueueState.find((item) => item.id === itemId);

  if (!matchingItem) {
    throw new Error("Transaction was not found in the processing queue.");
  }

  matchingItem.proofs = [...matchingItem.proofs, proof];
  return matchingItem;
}

export function completeBranchProcessingQueueItem(itemId: string): BranchProcessingQueueItem {
  const matchingItem = branchProcessingQueueState.find((item) => item.id === itemId);

  if (!matchingItem) {
    throw new Error("Transaction was not found in the processing queue.");
  }

  if (getBranchProcessingStatus(matchingItem.branchId) === "COMPLETED") {
    throw new Error("Processing session is locked. Queue is read-only.");
  }

  if (!canTransitionToStatus(matchingItem.status, "COMPLETED")) {
    throw new Error("This transaction cannot be completed from its current status.");
  }

  if (matchingItem.proofs.length === 0) {
    throw new Error("At least one proof-of-payment screenshot is required before completion.");
  }

  matchingItem.status = "COMPLETED";
  return matchingItem;
}

export function returnBranchProcessingQueueItem(
  itemId: string,
  returnReason: ReturnReason,
  comment: string,
): BranchProcessingQueueItem {
  const matchingItem = branchProcessingQueueState.find((item) => item.id === itemId);

  if (!matchingItem) {
    throw new Error("Transaction was not found in the processing queue.");
  }

  if (getBranchProcessingStatus(matchingItem.branchId) === "COMPLETED") {
    throw new Error("Processing session is locked. Queue is read-only.");
  }

  if (!canTransitionToStatus(matchingItem.status, "RETURNED")) {
    throw new Error("This transaction cannot be returned from its current status.");
  }

  if (!returnReason.isActive) {
    throw new Error("An active predefined Return Reason is required.");
  }

  matchingItem.status = "RETURNED";
  matchingItem.returnReason = returnReason;
  matchingItem.returnComment = comment || null;
  return matchingItem;
}

export function getBranchProcessingQueueSummary(branchId: string): BranchProcessingQueueSummary {
  const queueItems = getBranchProcessingQueue(branchId);

  const assigned = queueItems.filter((item) => item.status === "ASSIGNED").length;
  const inProgress = queueItems.filter((item) => item.status === "IN_PROGRESS").length;
  const completed = queueItems.filter((item) => item.status === "COMPLETED").length;
  const onHold = queueItems.filter((item) => item.status === "ON_HOLD").length;
  const returned = queueItems.filter((item) => item.status === "RETURNED").length;
  const total = queueItems.length;
  const remaining = assigned + inProgress + onHold;
  const completionPercentage = total === 0 ? 0 : Math.round(((completed + returned) / total) * 100);

  return { assigned, inProgress, completed, onHold, returned, remaining, total, completionPercentage };
}

export function isBranchProcessingComplete(branchId: string): boolean {
  const summary = getBranchProcessingQueueSummary(branchId);
  return summary.total > 0 && summary.assigned === 0 && summary.inProgress === 0 && summary.onHold === 0;
}

export function getBranchProcessingStatus(branchId: string): BranchProcessingStatus {
  return branchProcessingStatusState.get(branchId) ?? "PROCESSING";
}

export function finalizeBranchProcessing(branchId: string): BranchProcessingStatus | null {
  if (!isBranchProcessingComplete(branchId)) {
    return null;
  }

  branchProcessingStatusState.set(branchId, "COMPLETED");
  return "COMPLETED";
}
