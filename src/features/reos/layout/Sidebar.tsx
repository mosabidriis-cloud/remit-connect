import { Link, useLocation } from "react-router-dom";
import Badge from "../../../components/ui/Badge";
import { colors, radius, shadows, spacing, typography } from "../theme";
import { useReosSession } from "./reosAuthContext";
import { LogoPlaceholder } from "./LogoPlaceholder";
import { getVisibleSidebarSections } from "./sidebarConfig";

type SidebarProps = {
  collapsed: boolean;
};

export function Sidebar({ collapsed }: SidebarProps) {
  const location = useLocation();
  const { session } = useReosSession();

  // Sidebar only renders inside ReosSessionGate, which already redirects to /login
  // when there is no session - this is a defensive fallback, not the real guard.
  const sidebarSections = session ? getVisibleSidebarSections(session.role) : [];

  return (
    <aside
      className={`hidden border-r border-slate-200 bg-white shadow-sm shadow-slate-200/60 transition-[width] duration-300 ease-in-out md:flex md:min-h-screen md:flex-col ${
        collapsed ? "md:w-20" : "md:w-72"
      }`}
      style={{ backgroundColor: colors.surface, borderRight: `1px solid ${colors.border}`, boxShadow: shadows.panel }}
    >
      <div className="flex h-16 items-center border-b border-slate-200 px-4" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <LogoPlaceholder collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {sidebarSections.map((section) => (
          <div className="mb-6 last:mb-0" key={section.label}>
            <div
              className={`mb-2 overflow-hidden px-2 text-xs font-semibold uppercase tracking-normal text-slate-500 transition-all duration-300 ${
                collapsed ? "h-0 opacity-0" : "h-5 opacity-100"
              }`}
              style={{ color: colors.muted, fontSize: typography.caption, paddingLeft: spacing.sm, paddingRight: spacing.sm }}
            >
                {section.label}
            </div>
            <div className="grid gap-1.5">
              {section.items.map((item) => {
                const active = item.match.test(location.pathname);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                      active
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    } ${collapsed ? "justify-center" : ""}`}
                    key={item.label}
                    style={{
                      borderRadius: radius.sm,
                      color: active ? colors.surface : colors.slate700,
                      backgroundColor: active ? colors.slate950 : "transparent",
                      boxShadow: active ? shadows.sm : "none",
                    }}
                    title={collapsed ? item.label : undefined}
                    to={item.href}
                  >
                    <span
                      className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-emerald-400 transition-opacity duration-200 ${
                        active ? "opacity-100" : "opacity-0"
                      }`}
                      style={{ backgroundColor: colors.success, borderRadius: radius.sm }}
                    />
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded text-xs transition-colors ${
                        active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"
                      }`}
                      style={{
                        borderRadius: radius.sm,
                        backgroundColor: active ? "rgba(255,255,255,0.15)" : colors.slate100,
                        color: active ? colors.surface : colors.slate600,
                      }}
                    >
                      {getInitials(item.label)}
                    </span>
                    <span
                      className={`truncate transition-all duration-300 ${
                        collapsed ? "w-0 opacity-0" : "w-44 opacity-100"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed ? (
        <div className="border-t border-slate-200 p-4" style={{ borderTop: `1px solid ${colors.border}`, padding: spacing.lg }}>
          <Badge color="blue" text="Sprint 10" />
        </div>
      ) : null}
    </aside>
  );
}

function getInitials(value: string): string {
  return value
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
