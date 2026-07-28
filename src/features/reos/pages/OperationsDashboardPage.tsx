import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { BranchPerformanceTable } from "../components/BranchPerformanceTable";
import { CriticalAlertCard } from "../components/CriticalAlertCard";
import { DashboardHeader } from "../components/DashboardHeader";
import { DashboardStatCard } from "../components/DashboardStatCard";
import { ExceptionCenter } from "../components/ExceptionCenter";
import { TodaySummary } from "../components/TodaySummary";
import { WorkQueueTable } from "../components/WorkQueueTable";
import { buildOperationsDashboard } from "../services/dashboardService";
import type { OperationsDashboardRole, OperationsDashboardSourceData } from "../types/dashboard";

type OperationsDashboardLocationState = OperationsDashboardSourceData & {
  role?: OperationsDashboardRole;
};

export function OperationsDashboardPage() {
  const location = useLocation();
  const state = location.state as OperationsDashboardLocationState | null;
  const dashboard = useMemo(
    () => buildOperationsDashboard(state ?? {}, state?.role ?? "OPERATIONS_MANAGER"),
    [state],
  );

  const handleDrillDown = (path: string) => {
    const targetId = path.split("#")[1];

    if (!targetId) {
      return;
    }

    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="grid gap-6 p-4">
      <DashboardHeader generatedAt={dashboard.generatedAt} role={dashboard.role} />

      {dashboard.role === "GENERAL_MANAGER" ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          General Manager access is read-only overview only.
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {dashboard.criticalAlerts.map((alert) => (
          <CriticalAlertCard alert={alert} key={alert.id} onDrillDown={handleDrillDown} />
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.stats.map((stat) => (
          <DashboardStatCard key={stat.id} stat={stat} />
        ))}
      </section>

      <BranchPerformanceTable branches={dashboard.branchPerformance} />
      <WorkQueueTable items={dashboard.workQueue} />
      <ExceptionCenter items={dashboard.exceptions} onDrillDown={handleDrillDown} />
      <TodaySummary metrics={dashboard.todaySummary} />
    </section>
  );
}
