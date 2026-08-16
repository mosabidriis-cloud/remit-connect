import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../lib/database.types";
import type { AuditAction, AuditEntityType, AuditEvent, RecordAuditEventInput } from "../types/audit";

/**
 * REOS v1.0 Production Readiness Phase 3 (DEC-022, OPERATIONAL_PERSISTENCE.md). The
 * audit trail closes DECISIONS.md D-5 - BUSINESS_RULES.md states REOS owns "operational
 * workflow and audit," and the Operations Manager role explicitly "manages... audit."
 *
 * `recordAuditEvent` is called directly from every real business-action write path
 * (branchProcessingQueueService, branchAssignmentService, proofDownloadService,
 * liquidityService, userService) - never from a page, so an audit record cannot be
 * skipped by forgetting to call it at one of several call sites into the same action.
 *
 * A failed audit write never blocks the business action it describes - the same
 * non-blocking-additive-persistence precedent Import Intelligence established
 * (IMPORT_INTELLIGENCE.md): a Supabase outage must not stop a Branch Officer from
 * completing a transaction. Failures are logged, not thrown, and every call site
 * awaits this function specifically so that ordering (the audit write is attempted
 * synchronously with the action, not fired-and-forgotten) is still guaranteed.
 */

type AuditEventRow = Database["public"]["Tables"]["audit_events"]["Row"];

/**
 * `actorRole` is deliberately not a caller-supplied field on `RecordAuditEventInput` -
 * every audited action is performed by the currently-authenticated session, never on
 * behalf of someone else, so the acting role is read server-side via the same
 * `current_user_role()` SECURITY DEFINER helper RLS already trusts (AUTHENTICATION.md
 * Section 3), from the real `profiles` row for the caller's own `auth.uid()`. A client
 * cannot misreport its own role in its own audit record this way.
 *
 * Retries after a transient failure (network blip, a momentary auth-token refresh racing
 * the request) before giving up - observed during verification specifically for events
 * recorded immediately after an `admin-create-user` Edge Function call, where the
 * client's own session token can be mid-refresh. This function already never throws (see
 * below), so without a retry a single transient failure would silently drop the record
 * instead of self-correcting.
 */
export async function recordAuditEvent(input: RecordAuditEventInput): Promise<AuditEvent | null> {
  const retryDelaysMs = [300, 1000];

  for (const delayMs of retryDelaysMs) {
    const event = await attemptRecordAuditEvent(input);

    if (event) {
      return event;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return attemptRecordAuditEvent(input);
}

async function attemptRecordAuditEvent(input: RecordAuditEventInput): Promise<AuditEvent | null> {
  const { data: actorRole, error: roleError } = await supabase.rpc("current_user_role");

  if (roleError || !actorRole) {
    console.error("Unable to resolve actor role for audit event:", roleError?.message, input);
    return null;
  }

  const event: AuditEvent = {
    id: `audit-event-${crypto.randomUUID()}`,
    actorUserId: input.actorUserId,
    actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    branchId: input.branchId ?? null,
    details: input.details,
    performedAt: input.performedAt ?? new Date().toISOString(),
  };

  const { error } = await supabase.from("audit_events").insert(auditEventToRow(event));

  if (error) {
    console.error("Unable to record audit event:", error.message, event);
    return null;
  }

  return event;
}

/**
 * Read-only enumeration (Operations Manager only, enforced by RLS). Not consumed by any
 * report definition yet - Phase 3 persists the trail; building the Audit report category
 * itself (Assignment History, Lifecycle History, Processing History, Proof Download
 * History, User Activity) is separate, downstream Reporting work.
 */
export async function getAllAuditEvents(): Promise<readonly AuditEvent[]> {
  const { data, error } = await supabase.from("audit_events").select("*").order("performed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToAuditEvent);
}

export async function getAuditEventsByBranch(branchId: string): Promise<readonly AuditEvent[]> {
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .eq("branch_id", branchId)
    .order("performed_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToAuditEvent);
}

function auditEventToRow(event: AuditEvent): Database["public"]["Tables"]["audit_events"]["Insert"] {
  return {
    id: event.id,
    actor_user_id: event.actorUserId,
    actor_role: event.actorRole,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    branch_id: event.branchId,
    details: event.details,
    performed_at: event.performedAt,
  };
}

function mapRowToAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    action: row.action as AuditAction,
    entityType: row.entity_type as AuditEntityType,
    entityId: row.entity_id,
    branchId: row.branch_id,
    details: row.details,
    performedAt: row.performed_at,
  };
}
