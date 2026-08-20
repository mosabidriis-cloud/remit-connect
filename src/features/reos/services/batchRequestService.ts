import { recordAuditEvent } from "./auditService";
import { getBranchById } from "./branchRegistryService";
import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../lib/database.types";
import type { BatchRequest, BatchRequestStatus, CreateBatchRequestInput } from "../types/batchRequest";

/**
 * The pull side of batch assignment, mirroring notificationService.ts's shape: a
 * Branch Officer signals "my queue is empty, send me work" instead of waiting for a
 * Direct Remit Officer/Operations Manager to notice. `batch_requests` RLS (verified
 * live) scopes a Branch Officer to insert/select/cancel only their own branch's rows;
 * DRO/OM can see and resolve every branch's requests. At most one OPEN request per
 * branch is enforced at the UI level (callers check getOpenBatchRequestForBranch
 * before showing the "Request a Batch" control), not by a DB constraint.
 */

type BatchRequestRow = Database["public"]["Tables"]["batch_requests"]["Row"];

export async function createBatchRequest(input: CreateBatchRequestInput): Promise<BatchRequest> {
  const row: Database["public"]["Tables"]["batch_requests"]["Insert"] = {
    id: `batch-request-${crypto.randomUUID()}`,
    branch_id: input.branchId,
    requested_by_user_id: input.requestedByUserId,
    note: input.note ?? null,
    status: "OPEN",
  };

  const { data, error } = await supabase.from("batch_requests").insert(row).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  const request = mapRowToBatchRequest(data);

  await recordAuditEvent({
    actorUserId: input.requestedByUserId,
    action: "BATCH_REQUESTED",
    entityType: "BATCH_REQUEST",
    entityId: request.id,
    branchId: request.branchId,
    details: `Requested a batch for ${getBranchById(request.branchId)?.name ?? request.branchId}${request.note ? ` - "${request.note}"` : ""}.`,
  });

  await notifyDirectRemitOfficersOfBatchRequest(request);

  return request;
}

/** Best-effort, never throws - a failed notification must never block the request itself (same rule as notifyBranchOfficersOfBatchAssignment). */
async function notifyDirectRemitOfficersOfBatchRequest(request: BatchRequest): Promise<void> {
  try {
    const { data: officers, error: officersError } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["DIRECT_REMIT_OFFICER", "OPERATIONS_MANAGER"]);

    if (officersError) {
      console.error("Unable to resolve Direct Remit Officers for batch-request notification:", officersError.message, request.id);
      return;
    }

    if (!officers || officers.length === 0) {
      return;
    }

    const branchName = getBranchById(request.branchId)?.name ?? request.branchId;
    const message = `${branchName} requested a batch to process.${request.note ? ` "${request.note}"` : ""}`;

    const rows: Database["public"]["Tables"]["notifications"]["Insert"][] = officers.map((officer) => ({
      id: `notification-${crypto.randomUUID()}`,
      recipient_user_id: officer.id,
      branch_id: request.branchId,
      type: "BATCH_REQUESTED",
      title: "Branch requested a batch",
      message,
      entity_type: "BATCH_REQUEST",
      entity_id: request.id,
      is_read: false,
    }));

    const { error: insertError } = await supabase.from("notifications").insert(rows);

    if (insertError) {
      console.error("Unable to record batch-request notification:", insertError.message, request.id);
    }
  } catch (cause) {
    console.error("Unexpected error recording batch-request notification:", cause, request.id);
  }
}

export async function getOpenBatchRequestForBranch(branchId: string): Promise<BatchRequest | null> {
  const { data, error } = await supabase
    .from("batch_requests")
    .select("*")
    .eq("branch_id", branchId)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToBatchRequest(data) : null;
}

/** RLS already scopes DRO/OM to every branch's requests - no explicit branch filter needed. */
export async function getOpenBatchRequests(): Promise<BatchRequest[]> {
  const { data, error } = await supabase
    .from("batch_requests")
    .select("*")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToBatchRequest);
}

export async function cancelBatchRequest(id: string, actorUserId: string): Promise<void> {
  await resolveBatchRequest(id, { status: "CANCELLED", actorUserId });
}

/**
 * Best-effort auto-resolution, called from branchAssignmentService.ts::assignSharedBatchToBranch
 * right alongside its existing recordAuditEvent/notifyBranchOfficersOfBatchAssignment calls -
 * closes the loop the moment a batch actually reaches the requesting branch, without a manual
 * "mark fulfilled" click. Never throws - a failed resolution must not block the assignment.
 */
export async function resolveOpenBatchRequestForBranch(branchId: string, input: { actorUserId: string; fulfilledBySharedBatchId: string }): Promise<void> {
  try {
    const openRequest = await getOpenBatchRequestForBranch(branchId);

    if (!openRequest) {
      return;
    }

    await resolveBatchRequest(openRequest.id, {
      status: "FULFILLED",
      actorUserId: input.actorUserId,
      fulfilledBySharedBatchId: input.fulfilledBySharedBatchId,
    });
  } catch (cause) {
    console.error("Unable to auto-resolve batch request for branch:", cause, branchId);
  }
}

async function resolveBatchRequest(id: string, input: { status: BatchRequestStatus; actorUserId: string; fulfilledBySharedBatchId?: string }): Promise<void> {
  const update: Database["public"]["Tables"]["batch_requests"]["Update"] = {
    status: input.status,
    resolved_at: new Date().toISOString(),
    resolved_by_user_id: input.actorUserId,
    fulfilled_by_shared_batch_id: input.fulfilledBySharedBatchId ?? null,
  };

  const { error } = await supabase.from("batch_requests").update(update).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

function mapRowToBatchRequest(row: BatchRequestRow): BatchRequest {
  return {
    id: row.id,
    branchId: row.branch_id,
    requestedByUserId: row.requested_by_user_id,
    note: row.note,
    status: row.status as BatchRequestStatus,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedByUserId: row.resolved_by_user_id,
    fulfilledBySharedBatchId: row.fulfilled_by_shared_batch_id,
  };
}
