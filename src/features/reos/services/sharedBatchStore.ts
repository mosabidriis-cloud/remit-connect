import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
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

/**
 * Read-only enumeration of every Shared Batch held in the store (Sprint 16 M4.1,
 * DECISIONS.md DEC-007 / REPORTING_PROJECTION_LAYER.md D-4).
 *
 * Reporting needs enterprise-wide visibility (BUSINESS_RULES.md: the Operations
 * Manager sees all branches), which no existing accessor provides. This reads
 * only: it performs no lifecycle transition and writes nothing.
 *
 * The internal Map is never exposed and every batch is copied, so a caller cannot
 * reach or mutate stored state. Ordering is Map insertion order and is not part of
 * this contract - callers must apply their own deterministic sort
 * (REPORTING_PROJECTION_LAYER.md Section 9.5).
 */
export function getAllSharedBatches(): readonly SharedBatch[] {
  return Array.from(sharedBatches.values()).map(copySharedBatch);
}

/**
 * Read-only enumeration of every Assignment held in the store (Sprint 16 M4.1,
 * DECISIONS.md DEC-007 / REPORTING_PROJECTION_LAYER.md D-4).
 *
 * The enterprise-wide counterpart to getAssignmentsByBranch. Same guarantees as
 * getAllSharedBatches: copies only, no writes, no ordering contract. Creating or
 * updating an Assignment remains exclusive to branchAssignmentService (DEC-006);
 * this accessor only reads.
 */
export function getAllAssignments(): readonly Assignment[] {
  return Array.from(assignments.values()).map(copyAssignment);
}

function copySharedBatch(sharedBatch: SharedBatch): SharedBatch {
  return { ...sharedBatch };
}

function copyAssignment(assignment: Assignment): Assignment {
  return {
    ...assignment,
    assignedTransactions: assignment.assignedTransactions.map(copyBeneficiary),
    manualReviewTransactions: assignment.manualReviewTransactions.map(copyBeneficiary),
    invalidTransactions: assignment.invalidTransactions.map(copyBeneficiary),
  };
}

function copyBeneficiary(beneficiary: Beneficiary): Beneficiary {
  return { ...beneficiary };
}
