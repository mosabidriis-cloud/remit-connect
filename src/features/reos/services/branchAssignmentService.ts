import { createAssignment } from "./assignmentService";
import { recordAuditEvent } from "./auditService";
import { resolveOpenBatchRequestForBranch } from "./batchRequestService";
import { notifyBranchOfficersOfBatchAssignment } from "./notificationService";
import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type {
  SharedBatchAssignmentInput,
  SharedBatchReassignmentAudit,
  SharedBatchReassignmentInput,
} from "../types/branchAssignment";
import type { SharedBatch } from "../types/sharedBatch";

/**
 * Canonical Assignment workflow (Sprint 14 Milestone 1.5). This is the only
 * entry point that may create or update an Assignment for a Shared Batch.
 * assignmentService.createAssignment is an internal implementation detail of
 * this service and must not be called directly from pages or components.
 */
export interface AssignSharedBatchInput extends SharedBatchAssignmentInput {
  beneficiaries: Beneficiary[];
  branchName: string;
}

export interface AssignSharedBatchResult {
  sharedBatch: SharedBatch;
  assignment: Assignment;
  audit: null;
}

export interface ReassignSharedBatchInput extends SharedBatchReassignmentInput {
  assignment: Assignment;
  newBranchName: string;
}

export interface ReassignSharedBatchResult {
  sharedBatch: SharedBatch;
  assignment: Assignment;
  audit: SharedBatchReassignmentAudit;
}

/**
 * DEC-025: initial assignment is Direct Remit Officer (primary) or Operations Manager
 * (backup/override) - reversing DEC-014's move of this step to Operations Manager only.
 * Reassignment below is unaffected - still Operations-Manager-only, per DEC-006.
 */
export async function assignSharedBatchToBranch(input: AssignSharedBatchInput): Promise<AssignSharedBatchResult> {
  if (input.actorRole !== "OPERATIONS_MANAGER" && input.actorRole !== "DIRECT_REMIT_OFFICER") {
    throw new Error("Only the Direct Remit Officer or Operations Manager may assign an unassigned Shared Batch.");
  }

  if (input.sharedBatch.assignmentStatus === "ASSIGNED" || input.sharedBatch.isLocked) {
    throw new Error("Assigned Shared Batches are locked and cannot be assigned again.");
  }

  const assignedAt = new Date().toISOString();

  const assignment = createAssignment({
    sharedBatch: input.sharedBatch,
    beneficiaries: input.beneficiaries,
    branchId: input.branchId,
    branchName: input.branchName,
    assignedBy: input.assignedByUserId,
    assignedAt,
  });

  await recordAuditEvent({
    actorUserId: input.assignedByUserId,
    action: "BATCH_ASSIGNED",
    entityType: "ASSIGNMENT",
    entityId: assignment.id,
    branchId: input.branchId,
    details: `Assigned Shared Batch ${input.sharedBatch.reference} to ${input.branchName}.`,
    performedAt: assignedAt,
  });

  // Never throws - a failed notification must not block the assignment itself (same
  // non-blocking-additive-persistence rule recordAuditEvent above follows).
  await notifyBranchOfficersOfBatchAssignment(assignment);

  // Closes the "Request a Batch" loop automatically the moment a batch actually reaches
  // the requesting branch - never throws, same non-blocking rule as the notification above.
  await resolveOpenBatchRequestForBranch(input.branchId, {
    actorUserId: input.assignedByUserId,
    fulfilledBySharedBatchId: input.sharedBatch.id,
  });

  return {
    sharedBatch: {
      ...input.sharedBatch,
      assignmentStatus: "ASSIGNED",
      lifecycleStatus: "ASSIGNED",
      assignedBranchId: input.branchId,
      assignedByUserId: input.assignedByUserId,
      assignedAt,
      assignedBeneficiaries: assignment.assignedTransactions.length,
      isLocked: true,
    },
    assignment,
    audit: null,
  };
}

export async function reassignSharedBatch(input: ReassignSharedBatchInput): Promise<ReassignSharedBatchResult> {
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

  const assignment: Assignment = {
    ...input.assignment,
    assignedBranchId: input.newBranchId,
    assignedBranchName: input.newBranchName,
    assignedAt: reassignedAt,
  };

  await recordAuditEvent({
    actorUserId: input.reassignedByUserId,
    action: "BATCH_REASSIGNED",
    entityType: "ASSIGNMENT",
    entityId: assignment.id,
    branchId: input.newBranchId,
    details: `Reassigned Shared Batch ${input.sharedBatch.reference} from ${previousBranchId} to ${input.newBranchName}: ${input.reason}.`,
    performedAt: reassignedAt,
  });

  return {
    sharedBatch: {
      ...input.sharedBatch,
      assignmentStatus: "ASSIGNED",
      lifecycleStatus: "ASSIGNED",
      assignedBranchId: input.newBranchId,
      assignedBeneficiaries: assignment.assignedTransactions.length,
      isLocked: true,
      lastReassignedByUserId: input.reassignedByUserId,
      lastReassignedAt: reassignedAt,
      lastReassignmentReason: input.reason,
    },
    assignment,
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
