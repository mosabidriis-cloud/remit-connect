export type BatchRequestStatus = "OPEN" | "FULFILLED" | "CANCELLED";

/** A Branch Officer's pull request for a new batch, RLS-scoped to their own branch (or all branches for DRO/OM). */
export interface BatchRequest {
  id: string;
  branchId: string;
  requestedByUserId: string;
  note: string | null;
  status: BatchRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  fulfilledBySharedBatchId: string | null;
}

export interface CreateBatchRequestInput {
  branchId: string;
  requestedByUserId: string;
  note?: string | null;
}
