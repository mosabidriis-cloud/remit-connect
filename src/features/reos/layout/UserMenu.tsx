import { useNavigate } from "react-router-dom";
import { colors, radius, spacing, typography } from "../theme";
import { useReosSession } from "./reosAuthContext";

const roleLabel: Record<string, string> = {
  OPERATIONS_MANAGER: "Operations Manager",
  DIRECT_REMIT_OFFICER: "Direct Remit Officer",
  BRANCH_OFFICER: "Branch Officer",
};

export function UserMenu() {
  const navigate = useNavigate();
  const { session, signOut } = useReosSession();

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
        className="flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
      <button
        className="absolute right-0 top-full mt-2 flex h-9 items-center rounded border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        onClick={() => void handleLogout()}
        style={{ borderColor: colors.border, borderRadius: radius.sm, color: colors.slate700 }}
        type="button"
      >
        Logout
      </button>
    </div>
  );
}
