import { Breadcrumbs } from "./Breadcrumbs";
import { SearchBar } from "./SearchBar";
import { UserMenu } from "./UserMenu";

type HeaderProps = {
  collapsed: boolean;
  onToggleSidebar: () => void;
};

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden h-9 w-9 place-items-center rounded border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 md:grid"
        onClick={onToggleSidebar}
        type="button"
      >
        {collapsed ? ">>" : "<<"}
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <SearchBar />

      <button
        aria-label="Notifications"
        className="grid h-9 w-9 place-items-center rounded border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        type="button"
      >
        N
      </button>

      <UserMenu />
    </header>
  );
}
