import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../lib/database.types";
import type { Assignment } from "../types/assignment";
import type { Notification, NotificationEntityType, NotificationType } from "../types/notification";

/**
 * In-app notifications, mirroring auditService.ts's shape and philosophy: a system-fired
 * event written to a durable table, read only by whoever it concerns. `notifications` RLS
 * (verified against the live database) restricts SELECT/UPDATE to
 * `recipient_user_id = auth.uid()` and INSERT to the same two roles that can create an
 * Assignment (`OPERATIONS_MANAGER`, `DIRECT_REMIT_OFFICER`) - see AUDIT_TRAIL.md for the
 * precedent this follows.
 *
 * Like `recordAuditEvent`, `notifyBranchOfficersOfBatchAssignment` never throws: a failed
 * notification write must never block the batch assignment that triggered it. Failures are
 * logged, not surfaced to the caller.
 */

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

/**
 * Called from branchAssignmentService.ts::assignSharedBatchToBranch, right alongside its
 * existing recordAuditEvent call - the one canonical place an initial assignment is made.
 * Resolves every Branch Officer at the assigned branch (a branch may have more than one)
 * and gives each their own notification row.
 */
export async function notifyBranchOfficersOfBatchAssignment(assignment: Assignment): Promise<void> {
  try {
    if (!assignment.assignedBranchId) {
      return;
    }

    const { data: officers, error: officersError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "BRANCH_OFFICER")
      .eq("branch_id", assignment.assignedBranchId);

    if (officersError) {
      console.error("Unable to resolve Branch Officers for batch-assignment notification:", officersError.message, assignment.id);
      return;
    }

    if (!officers || officers.length === 0) {
      return;
    }

    const itemCount = assignment.assignedTransactions.length;
    const totalsByCurrency = new Map<string, number>();

    for (const transaction of assignment.assignedTransactions) {
      totalsByCurrency.set(transaction.currency, (totalsByCurrency.get(transaction.currency) ?? 0) + transaction.amount);
    }

    const totalsSummary = totalsByCurrency.size === 0
      ? "0 items"
      : Array.from(totalsByCurrency.entries())
          .map(([currency, total]) => `${total.toLocaleString()} ${currency}`)
          .join(", ");

    const branchName = assignment.assignedBranchName ?? assignment.assignedBranchId;
    const message = `Batch ${assignment.batchReference} assigned to ${branchName} - ${itemCount} item${itemCount === 1 ? "" : "s"}, ${totalsSummary}.`;

    const rows: Database["public"]["Tables"]["notifications"]["Insert"][] = officers.map((officer) => ({
      id: `notification-${crypto.randomUUID()}`,
      recipient_user_id: officer.id,
      branch_id: assignment.assignedBranchId as string,
      type: "BATCH_ASSIGNED" satisfies NotificationType,
      title: "New batch assigned",
      message,
      entity_type: "SHARED_BATCH" satisfies NotificationEntityType,
      entity_id: assignment.sharedBatchId,
      is_read: false,
    }));

    const { error: insertError } = await supabase.from("notifications").insert(rows);

    if (insertError) {
      console.error("Unable to record batch-assignment notification:", insertError.message, assignment.id);
    }
  } catch (cause) {
    console.error("Unexpected error recording batch-assignment notification:", cause, assignment.id);
  }
}

/** RLS already scopes rows to the caller - no explicit recipient filter needed. */
export async function getMyNotifications(): Promise<readonly Notification[]> {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Exported so NotificationBell can map a realtime INSERT payload with the same logic. */
export function mapRowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    branchId: row.branch_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    entityType: row.entity_type as NotificationEntityType,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
