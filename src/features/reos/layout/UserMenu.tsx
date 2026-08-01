import { useNavigate } from "react-router-dom";
import { colors, radius, spacing, typography } from "../theme";

const DEV_AUTH_KEY = "reos-auth";

export function UserMenu() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem(DEV_AUTH_KEY);
    navigate("/login", { replace: true });
  }

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
          OM
        </span>
        <span className="hidden lg:inline">Operations Manager</span>
      </button>
      <button
        className="absolute right-0 top-full mt-2 flex h-9 items-center rounded border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        onClick={handleLogout}
        style={{ borderColor: colors.border, borderRadius: radius.sm, color: colors.slate700 }}
        type="button"
      >
        Logout
      </button>
    </div>
  );
}
