import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";

export type BranchProcessingQueueStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "RETURNED";

export interface BranchProcessingQueueItem {
  id: string;
  assignmentId: string;
  branchId: string;
  beneficiary: Beneficiary;
  status: BranchProcessingQueueStatus;
}

const branchProcessingQueueState: BranchProcessingQueueItem[] = [];

export function resetBranchProcessingQueue() {
  branchProcessingQueueState.length = 0;
}

export function hydrateBranchProcessingQueue(assignments: Assignment[]) {
  const nextItems = assignments.flatMap((assignment) =>
    (assignment.assignedTransactions ?? []).map((beneficiary) => ({
      id: `${assignment.id}-${beneficiary.id}`,
      assignmentId: assignment.id,
      branchId: assignment.assignedBranchId ?? "",
      beneficiary,
      status: "ASSIGNED" as BranchProcessingQueueStatus,
    })),
  );

  branchProcessingQueueState.splice(0, branchProcessingQueueState.length, ...nextItems);
  return branchProcessingQueueState.slice();
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

  if (!canTransitionToStatus(matchingItem.status, status)) {
    return matchingItem;
  }

  matchingItem.status = status;
  return matchingItem;
}

export function getBranchProcessingQueueSummary(branchId: string) {
  const queueItems = getBranchProcessingQueue(branchId);

  return {
    assigned: queueItems.filter((item) => item.status === "ASSIGNED").length,
    inProgress: queueItems.filter((item) => item.status === "IN_PROGRESS").length,
    completed: queueItems.filter((item) => item.status === "COMPLETED").length,
    onHold: queueItems.filter((item) => item.status === "ON_HOLD").length,
    returned: queueItems.filter((item) => item.status === "RETURNED").length,
  };
}
