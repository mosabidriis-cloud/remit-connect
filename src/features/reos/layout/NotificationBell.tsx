import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { getMyNotifications, mapRowToNotification, markNotificationRead } from "../services/notificationService";
import { colors, radius, shadows, spacing, typography } from "../theme";
import type { Notification } from "../types/notification";
import { useReosSession } from "./reosAuthContext";

/**
 * Replaces the static "N" placeholder button. Fetches once on session start (covers
 * "alerted upon login") and holds a Supabase Realtime subscription for the rest of the
 * session, so a newly-inserted notification (branchAssignmentService.ts's
 * notifyBranchOfficersOfBatchAssignment) appears the moment it's written - no polling.
 */
export function NotificationBell() {
  const { session } = useReosSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Deferred past the current synchronous effect tick so the session-null reset below
    // never runs synchronously within the effect body itself (react-hooks/set-state-in-effect).
    (async () => {
      await Promise.resolve();

      if (cancelled) {
        return;
      }

      if (!session) {
        setNotifications([]);
        return;
      }

      try {
        const result = await getMyNotifications();

        if (!cancelled) {
          setNotifications([...result]);
        }
      } catch (cause) {
        console.error("Unable to load notifications:", cause);
      }
    })();

    if (!session) {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel(`notifications-${session.userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_user_id=eq.${session.userId}` },
        (payload) => {
          const inserted = mapRowToNotification(payload.new as Parameters<typeof mapRowToNotification>[0]);
          setNotifications((current) => [inserted, ...current]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [session]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  async function handleSelect(notification: Notification) {
    if (notification.isRead) {
      return;
    }

    setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));

    try {
      await markNotificationRead(notification.id);
    } catch (cause) {
      console.error("Unable to mark notification read:", cause);
    }
  }

  return (
    <div className="relative">
      <button
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1"
        onClick={() => setOpen((current) => !current)}
        style={{ borderColor: colors.border, borderRadius: radius.sm, color: colors.slate700 }}
        type="button"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
            style={{ backgroundColor: colors.danger }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            aria-label="Close notifications"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            style={{ background: "transparent" }}
            type="button"
          />
          <div
            className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.lg }}
          >
            <div style={{ borderBottom: `1px solid ${colors.border}`, color: colors.text, fontSize: typography.small, fontWeight: 600, padding: `${spacing.sm}px ${spacing.md}px` }}>
              Notifications
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <p style={{ color: colors.muted, fontSize: typography.small, padding: spacing.md }}>No notifications yet.</p>
              ) : (
                notifications.map((notification) => (
                  <button
                    className="block w-full text-left transition hover:bg-slate-50"
                    key={notification.id}
                    onClick={() => void handleSelect(notification)}
                    style={{
                      backgroundColor: notification.isRead ? colors.surface : colors.blue50,
                      borderBottom: `1px solid ${colors.slate100}`,
                      padding: `${spacing.sm}px ${spacing.md}px`,
                    }}
                    type="button"
                  >
                    <div style={{ alignItems: "flex-start", display: "flex", gap: spacing.xs, justifyContent: "space-between" }}>
                      <span style={{ color: colors.text, fontSize: typography.small, fontWeight: notification.isRead ? 500 : 700 }}>
                        {notification.title}
                      </span>
                      {!notification.isRead ? (
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: colors.primary }} />
                      ) : null}
                    </div>
                    <p style={{ color: colors.slate700, fontSize: typography.small, marginTop: spacing.xs }}>{notification.message}</p>
                    <p style={{ color: colors.muted, fontSize: typography.caption, marginTop: spacing.xs }}>{formatRelativeTime(notification.createdAt)}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} viewBox="0 0 24 24">
      <path d="M6 8a6 6 0 0 1 12 0c0 4.5 1.5 6 2 7H4c.5-1 2-2.5 2-7Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function formatRelativeTime(value: string): string {
  const elapsedMs = Date.now() - new Date(value).getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  if (elapsedMinutes < 1) {
    return "Just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays}d ago`;
}
