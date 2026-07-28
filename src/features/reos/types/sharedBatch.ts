export type SharedBatchAssignmentStatus =
  | "UNASSIGNED"
  | "ASSIGNED";

export type SharedBatchLifecycleStatus =
  | "ASSIGNED"
  | "PROCESSING"
  | "COMPLETED"
  | "READY_FOR_DOWNLOAD"
  | "DOWNLOADED";

export interface SharedBatch {
  id: string;
  reference: string;
  fileName: string;
  uploadDate: string;
  uploadedByUserId: string;
  totalBeneficiaries: number;
  assignedBeneficiaries: number;
  completedBeneficiaries: number;
  returnedBeneficiaries: number;
  duplicateReferenceCount: number;
  manualReviewCount: number;
  assignmentStatus: SharedBatchAssignmentStatus;
  lifecycleStatus: SharedBatchLifecycleStatus;
  assignedBranchId: string | null;
  assignedByUserId: string | null;
  assignedAt: string | null;
  isLocked: boolean;
  lastReassignedByUserId: string | null;
  lastReassignedAt: string | null;
  lastReassignmentReason: string | null;
}
