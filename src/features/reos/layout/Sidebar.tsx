import { Link, useLocation } from "react-router-dom";
import Badge from "../../../components/ui/Badge";

export type SidebarItem = {
  label: string;
  href: string;
  match: RegExp;
};

type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

type SidebarProps = {
  collapsed: boolean;
};

export const sidebarSections: SidebarSection[] = [
  {
    label: "Operations",
    items: [
      {
        label: "Dashboard",
        href: "/reos/dashboard",
        match: /^\/reos\/dashboard$/,
      },
      {
        label: "Reports",
        href: "/reos/reports",
        match: /^\/reos\/reports$/,
      },
      {
        label: "Branch Processing",
        href: "/reos/branches/BRANCH_ID/processing",
        match: /^\/reos\/branches\/[^/]+\/processing$/,
      },
      {
        label: "Transaction Processing",
        href: "/reos/branches/BRANCH_ID/processing/BATCH_ID/transactions/TRANSACTION_ID",
        match: /^\/reos\/branches\/[^/]+\/processing\/[^/]+\/transactions\/[^/]+$/,
      },
    ],
  },
  {
    label: "Shared Batches",
    items: [
      {
        label: "Upload",
        href: "/reos/shared-batches/upload",
        match: /^\/reos\/shared-batches\/upload$/,
      },
      {
        label: "Assignment",
        href: "/reos/shared-batches/assignment",
        match: /^\/reos\/shared-batches\/assignment$/,
      },
      {
        label: "Proof Download",
        href: "/reos/shared-batches/BATCH_ID/proof-download",
        match: /^\/reos\/shared-batches\/[^/]+\/proof-download$/,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Users",
        href: "/reos/administration/users",
        match: /^\/reos\/administration\/users$/,
      },
      {
        label: "Create User",
        href: "/reos/administration/users/create",
        match: /^\/reos\/administration\/users\/create$/,
      },
      {
        label: "User Details",
        href: "/reos/administration/users/USER_ID",
        match: /^\/reos\/administration\/users\/[^/]+$/,
      },
      {
        label: "Edit User",
        href: "/reos/administration/users/USER_ID/edit",
        match: /^\/reos\/administration\/users\/[^/]+\/edit$/,
      },
    ],
  },
];

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`hidden border-r border-slate-200 bg-white transition-all duration-200 md:flex md:min-h-screen md:flex-col ${
        collapsed ? "md:w-20" : "md:w-72"
      }`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded bg-slate-950 text-sm font-semibold text-white">
          RE
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-950">REOS</div>
            <div className="truncate text-xs text-slate-500">Operations System</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sidebarSections.map((section) => (
          <div className="mb-5" key={section.label}>
            {!collapsed ? (
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
                {section.label}
              </div>
            ) : null}
            <div className="grid gap-1">
              {section.items.map((item) => {
                const active = item.match.test(location.pathname);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    } ${collapsed ? "justify-center" : ""}`}
                    key={item.label}
                    title={collapsed ? item.label : undefined}
                    to={item.href}
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded text-xs ${
                        active ? "bg-white/15" : "bg-slate-100"
                      }`}
                    >
                      {getInitials(item.label)}
                    </span>
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed ? (
        <div className="border-t border-slate-200 p-4">
          <Badge color="blue" text="Sprint 10" />
        </div>
      ) : null}
    </aside>
  );
}

export function getActiveSidebarItem(pathname: string): SidebarItem | undefined {
  return sidebarSections.flatMap((section) => section.items).find((item) => item.match.test(pathname));
}

function getInitials(value: string): string {
  return value
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
