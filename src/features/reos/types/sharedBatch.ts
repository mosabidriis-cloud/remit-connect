export type SharedBatchAssignmentStatus =
  | "UNASSIGNED"
  | "ASSIGNED";

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
  assignedBranchId: string | null;
  assignedByUserId: string | null;
  assignedAt: string | null;
  isLocked: boolean;
  lastReassignedByUserId: string | null;
  lastReassignedAt: string | null;
  lastReassignmentReason: string | null;
}
