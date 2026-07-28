import type {
  SharedBatchAssignmentInput,
  SharedBatchAssignmentResult,
  SharedBatchReassignmentInput,
} from "../types/branchAssignment";
import type { SharedBatch } from "../types/sharedBatch";

export function assignSharedBatchToBranch(input: SharedBatchAssignmentInput): SharedBatchAssignmentResult {
  if (input.actorRole !== "DIRECT_REMIT_OFFICER") {
    throw new Error("Only the Direct Remit Officer may assign an unassigned Shared Batch.");
  }

  if (input.sharedBatch.assignmentStatus === "ASSIGNED" || input.sharedBatch.isLocked) {
    throw new Error("Assigned Shared Batches are locked and cannot be assigned again.");
  }

  const assignedAt = new Date().toISOString();

  return {
    sharedBatch: {
      ...input.sharedBatch,
      assignmentStatus: "ASSIGNED",
      assignedBranchId: input.branchId,
      assignedByUserId: input.assignedByUserId,
      assignedAt,
      assignedBeneficiaries: input.sharedBatch.totalBeneficiaries,
      isLocked: true,
    },
    audit: null,
  };
}

export function reassignSharedBatch(input: SharedBatchReassignmentInput): SharedBatchAssignmentResult {
  if (input.actorRole !== "OPERATIONS_MANAGER") {
    throw new Error("Only the Operations Manager may reassign a Shared Batch.");
  }

  if (!input.sharedBatch.assignedBranchId) {
    throw new Error("Only assigned Shared Batches may be reassigned.");
  }

  if (!input.reason.trim()) {
    throw new Error("A reassignment reason is required.");
  }

  const reassignedAt = new Date().toISOString();
  const previousBranchId = input.sharedBatch.assignedBranchId;

  return {
    sharedBatch: {
      ...input.sharedBatch,
      assignmentStatus: "ASSIGNED",
      assignedBranchId: input.newBranchId,
      assignedBeneficiaries: input.sharedBatch.totalBeneficiaries,
      isLocked: true,
      lastReassignedByUserId: input.reassignedByUserId,
      lastReassignedAt: reassignedAt,
      lastReassignmentReason: input.reason,
    },
    audit: {
      sharedBatchId: input.sharedBatch.id,
      previousBranchId,
      newBranchId: input.newBranchId,
      reassignedByUserId: input.reassignedByUserId,
      reassignedAt,
      reason: input.reason,
    },
  };
}

export function getSharedBatchesVisibleToBranchOfficer(sharedBatches: SharedBatch[], branchId: string): SharedBatch[] {
  return sharedBatches.filter((sharedBatch) => sharedBatch.assignedBranchId === branchId);
}
