import { Link, useLocation } from "react-router-dom";
import { getActiveSidebarItem } from "./Sidebar";

export function Breadcrumbs() {
  const location = useLocation();
  const activeItem = getActiveSidebarItem(location.pathname);
  const crumbs = ["REOS", activeItem?.label ?? "Workspace"];

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 text-sm text-slate-600">
      <ol className="flex min-w-0 flex-wrap items-center gap-2">
        <li>
          <Link className="font-medium text-slate-700 hover:text-slate-950" to="/reos/dashboard">
            {crumbs[0]}
          </Link>
        </li>
        <li className="text-slate-400">/</li>
        <li className="truncate font-medium text-slate-950">{crumbs[1]}</li>
      </ol>
    </nav>
  );
}
