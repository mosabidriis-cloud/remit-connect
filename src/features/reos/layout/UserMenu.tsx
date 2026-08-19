import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { colors, radius, shadows, spacing, typography } from "../theme";
import { useReosSession } from "./reosAuthContext";

const roleLabel: Record<string, string> = {
  OPERATIONS_MANAGER: "Operations Manager",
  DIRECT_REMIT_OFFICER: "Direct Remit Officer",
  BRANCH_OFFICER: "Branch Officer",
};

/**
 * A real toggleable dropdown - previously the Logout button was unconditionally rendered
 * `absolute` below the trigger, so it visually floated below the header row instead of
 * appearing only on demand. Closed by default now; opens on trigger click, closes via the
 * same click-outside-backdrop pattern NotificationBell uses.
 */
export function UserMenu() {
  const navigate = useNavigate();
  const { session, signOut } = useReosSession();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  const initials = session
    ? session.fullName
        .split(" ")
        .map((word) => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1"
        onClick={() => setOpen((current) => !current)}
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.slate700,
          fontSize: typography.small,
          padding: `0 ${spacing.md}px`,
        }}
        type="button"
      >
        <span
          className="grid h-7 w-7 place-items-center rounded bg-slate-100 text-xs font-semibold text-slate-700"
          style={{
            backgroundColor: colors.slate100,
            borderRadius: radius.sm,
            color: colors.slate700,
            fontSize: typography.caption,
            fontWeight: 600,
          }}
        >
          {initials}
        </span>
        <span className="hidden lg:inline">{session ? roleLabel[session.role] : "..."}</span>
      </button>

      {open ? (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            style={{ background: "transparent" }}
            type="button"
          />
          <div
            className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.lg }}
          >
            <div style={{ borderBottom: `1px solid ${colors.slate100}`, padding: spacing.md }}>
              <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{session?.fullName ?? "..."}</div>
              <div style={{ color: colors.muted, fontSize: typography.caption, marginTop: 2 }}>{session ? roleLabel[session.role] : ""}</div>
            </div>
            <button
              className="w-full text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600/40"
              onClick={() => void handleLogout()}
              style={{ color: colors.danger, fontSize: typography.small, fontWeight: 600, padding: `${spacing.sm}px ${spacing.md}px` }}
              type="button"
            >
              Log out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
