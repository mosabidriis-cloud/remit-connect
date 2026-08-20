import { useLocation } from "react-router-dom";
import { colors, radius, shadows, spacing } from "../theme";
import { Breadcrumbs } from "./Breadcrumbs";
import { NotificationBell } from "./NotificationBell";
import { SearchBar } from "./SearchBar";
import { getActiveSidebarItem } from "./sidebarConfig";
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
        className="hidden h-10 w-10 shrink-0 place-items-center rounded border border-slate-200 text-slate-700 transition hover:-translate-y-px hover:bg-slate-50 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1 md:grid"
        onClick={onToggleSidebar}
        style={{ borderColor: colors.border, borderRadius: radius.sm, boxShadow: shadows.sm, color: colors.slate700 }}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        type="button"
      >
        <SidebarToggleIcon collapsed={collapsed} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-slate-950">{pageTitle}</h1>
        <Breadcrumbs />
      </div>

      <SearchBar />

      <NotificationBell />

      <UserMenu />
    </header>
  );
}

/** The standard "panel with a collapsible rail" glyph (as in VS Code/Linear/Notion), not literal "<<"/">>" text. The inner chevron points the direction the click will take the sidebar. */
function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} viewBox="0 0 24 24">
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <path d="M9 4v16" />
      {collapsed ? <polyline points="4.5 9.5 7.5 12 4.5 14.5" /> : <polyline points="7.5 9.5 4.5 12 7.5 14.5" />}
    </svg>
  );
}
