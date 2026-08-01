import type { Assignment } from "../types/assignment";
import type { SharedBatch, SharedBatchLifecycleStatus } from "../types/sharedBatch";

const sharedBatches = new Map<string, SharedBatch>();
const assignments = new Map<string, Assignment>();

export function saveSharedBatch(sharedBatch: SharedBatch): SharedBatch {
  sharedBatches.set(sharedBatch.id, sharedBatch);
  return sharedBatch;
}

export function getSharedBatch(sharedBatchId: string): SharedBatch | null {
  return sharedBatches.get(sharedBatchId) ?? null;
}

export function updateSharedBatchLifecycleStatus(
  sharedBatchId: string,
  lifecycleStatus: SharedBatchLifecycleStatus,
): SharedBatch | null {
  const sharedBatch = sharedBatches.get(sharedBatchId);

  if (!sharedBatch) {
    return null;
  }

  const updated: SharedBatch = { ...sharedBatch, lifecycleStatus };
  sharedBatches.set(sharedBatchId, updated);
  return updated;
}

export function saveAssignment(assignment: Assignment): Assignment {
  assignments.set(assignment.id, assignment);
  return assignment;
}

export function getAssignment(assignmentId: string): Assignment | null {
  return assignments.get(assignmentId) ?? null;
}

export function getAssignmentsByBranch(branchId: string): Assignment[] {
  return Array.from(assignments.values()).filter((assignment) => assignment.assignedBranchId === branchId);
}
