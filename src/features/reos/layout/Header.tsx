import { useLocation } from "react-router-dom";
import { colors, radius, spacing } from "../theme";
import { Breadcrumbs } from "./Breadcrumbs";
import { SearchBar } from "./SearchBar";
import { getActiveSidebarItem } from "./Sidebar";
import { UserMenu } from "./UserMenu";

type HeaderProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
};

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  const location = useLocation();
  const pageTitle = getActiveSidebarItem(location.pathname)?.label ?? "Workspace";

  return (
    <header
      className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center md:flex-nowrap"
      style={{
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        gap: spacing.lg,
        paddingBottom: spacing.md,
        paddingLeft: spacing.lg,
        paddingRight: spacing.lg,
        paddingTop: spacing.md,
      }}
    >
      <button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden h-10 w-10 shrink-0 place-items-center rounded border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:grid"
        onClick={onToggleSidebar}
        style={{ borderColor: colors.border, borderRadius: radius.sm, color: colors.slate700 }}
        type="button"
      >
        {collapsed ? ">>" : "<<"}
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-slate-950">{pageTitle}</h1>
        <Breadcrumbs />
      </div>

      <SearchBar />

      <button
        aria-label="Notifications"
        className="grid h-10 w-10 shrink-0 place-items-center rounded border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        style={{ borderColor: colors.border, borderRadius: radius.sm, color: colors.slate700 }}
        type="button"
      >
        N
      </button>

      <UserMenu />
    </header>
  );
}
