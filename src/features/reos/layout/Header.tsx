import { useLocation } from "react-router-dom";
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
    <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-4 py-3 md:flex-nowrap md:px-6">
      <button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden h-10 w-10 shrink-0 place-items-center rounded border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:grid"
        onClick={onToggleSidebar}
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
        type="button"
      >
        N
      </button>

      <UserMenu />
    </header>
  );
}
