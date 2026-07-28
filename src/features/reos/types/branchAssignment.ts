import type { SharedBatch } from "./sharedBatch";
import type { ReosUserRole } from "./user";

export interface SharedBatchAssignmentInput {
  sharedBatch: SharedBatch;
  branchId: string;
  assignedByUserId: string;
  actorRole: ReosUserRole;
}

export interface SharedBatchReassignmentInput {
  sharedBatch: SharedBatch;
  newBranchId: string;
  reassignedByUserId: string;
  actorRole: ReosUserRole;
  reason: string;
}

export interface SharedBatchReassignmentAudit {
  sharedBatchId: string;
  previousBranchId: string;
  newBranchId: string;
  reassignedByUserId: string;
  reassignedAt: string;
  reason: string;
}

export interface SharedBatchAssignmentResult {
  sharedBatch: SharedBatch;
  audit: SharedBatchReassignmentAudit | null;
}
