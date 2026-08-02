import { getAssignment, getSharedBatch, updateSharedBatchLifecycleStatus } from "./sharedBatchStore";
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
  // Re-hydration must be idempotent: mounting this branch's queue again (e.g. the
  // officer navigates away and back) must not discard progress already made. Existing
  // items are preserved as-is; only assignment-beneficiary pairs not yet in the queue
  // get a fresh ASSIGNED item. Branch-level status (PROCESSING/COMPLETED) is left
  // untouched here for the same reason - see finalizeBranchProcessing for its only writer.
  const existingItemsById = new Map(
    branchProcessingQueueState
      .filter((item) => item.branchId === branchId)
      .map((item) => [item.id, item] as const),
  );

  const nextItems = assignments.flatMap((assignment) =>
    (assignment.assignedTransactions ?? []).map((beneficiary) => {
      const id = `${assignment.id}-${beneficiary.id}`;
      const existingItem = existingItemsById.get(id);

      if (existingItem) {
        return existingItem;
      }

      return {
        id,
        assignmentId: assignment.id,
        branchId,
        beneficiary,
        status: "ASSIGNED" as BranchProcessingQueueStatus,
        proofs: [] as ProofOfPayment[],
        returnReason: null as ReturnReason | null,
        returnComment: null as string | null,
      };
    }),
  );

  const otherBranchItems = branchProcessingQueueState.filter((item) => item.branchId !== branchId);
  branchProcessingQueueState.splice(0, branchProcessingQueueState.length, ...otherBranchItems, ...nextItems);

  // A branch accepting its assigned transactions into the processing queue is the
  // point at which the underlying Shared Batch is accepted into workflow (LIFECYCLE.md
  // ASSIGNED -> PROCESSING). Only advances batches still at ASSIGNED.
  assignments.forEach((assignment) => {
    const sharedBatch = getSharedBatch(assignment.sharedBatchId);

    if (sharedBatch && sharedBatch.lifecycleStatus === "ASSIGNED") {
      updateSharedBatchLifecycleStatus(assignment.sharedBatchId, "PROCESSING");
    }
  });

  return getBranchProcessingQueue(branchId);
}

export function getBranchProcessingQueue(branchId: string): BranchProcessingQueueItem[] {
  return branchProcessingQueueState.filter((item) => item.branchId === branchId);
}

/**
 * Read-only enumeration of every branch's processing queue items (Sprint 16 M4.1,
 * DECISIONS.md DEC-007 / REPORTING_PROJECTION_LAYER.md D-4).
 *
 * The enterprise-wide counterpart to getBranchProcessingQueue, which can only read
 * one branch at a time and so cannot serve Operations Manager visibility.
 *
 * Guarantees, all of which this function depends on being kept:
 * - It never calls hydrateBranchProcessingQueue. Reading a queue must never rebuild
 *   one: hydration was found in Sprint 15 M1.75 to have silently discarded completed
 *   work, and a read path must not be able to reach it even now that it is idempotent.
 * - It writes nothing - no item status, no proof, no branch-level status.
 * - It returns deep copies. Unlike getBranchProcessingQueue, which returns live item
 *   references that Branch Processing relies on, nothing here is reachable back into
 *   branchProcessingQueueState, so a reporting consumer cannot mutate processing state.
 * - Ordering is internal array order and is not part of this contract - callers must
 *   apply their own deterministic sort (REPORTING_PROJECTION_LAYER.md Section 9.5).
 *
 * Branch-level status is not enumerated here: branch ids are derivable from these
 * items, and getBranchProcessingStatus already reads status per branch.
 */
export function getAllBranchProcessingQueueItems(): readonly BranchProcessingQueueItem[] {
  return branchProcessingQueueState.map(copyBranchProcessingQueueItem);
}

function copyBranchProcessingQueueItem(item: BranchProcessingQueueItem): BranchProcessingQueueItem {
  return {
    ...item,
    beneficiary: { ...item.beneficiary },
    proofs: item.proofs.map((proof) => ({ ...proof })),
    returnReason: item.returnReason ? { ...item.returnReason } : null,
  };
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

  // Mirror the branch-level completion into the Shared Batch lifecycle (LIFECYCLE.md
  // PROCESSING -> COMPLETED) so Proof Management can pick up the batch. Only advances
  // batches still at PROCESSING.
  const sharedBatchIds = new Set(
    getBranchProcessingQueue(branchId)
      .map((item) => getAssignment(item.assignmentId)?.sharedBatchId)
      .filter((sharedBatchId): sharedBatchId is string => Boolean(sharedBatchId)),
  );

  sharedBatchIds.forEach((sharedBatchId) => {
    const sharedBatch = getSharedBatch(sharedBatchId);

    if (sharedBatch && sharedBatch.lifecycleStatus === "PROCESSING") {
      updateSharedBatchLifecycleStatus(sharedBatchId, "COMPLETED");
    }
  });

  return "COMPLETED";
}
