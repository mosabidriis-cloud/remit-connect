import type { OperationsDashboardRole } from "../types/dashboard";

type DashboardHeaderProps = {
  generatedAt: string;
  role: OperationsDashboardRole;
};

export function DashboardHeader({ generatedAt, role }: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Operations Command Center</h1>
        <p className="text-sm text-slate-600">What requires the Operations Manager's attention right now?</p>
      </div>
      <div className="text-right text-sm text-slate-600">
        <div className="font-medium text-slate-900">{formatRole(role)}</div>
        <div>Updated {formatDateTime(generatedAt)}</div>
      </div>
    </header>
  );
}

function formatRole(role: OperationsDashboardRole): string {
  return role === "GENERAL_MANAGER" ? "General Manager Overview" : "Operations Manager";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
