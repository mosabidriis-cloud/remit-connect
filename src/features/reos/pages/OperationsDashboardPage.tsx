import { useEffect, useState } from "react";
import { BranchPerformanceTable } from "../components/BranchPerformanceTable";
import { KpiCard } from "../components/common/KpiCard";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { CriticalAlertCard } from "../components/CriticalAlertCard";
import { ExceptionCenter } from "../components/ExceptionCenter";
import { TodaySummary } from "../components/TodaySummary";
import { WorkQueueTable } from "../components/WorkQueueTable";
import { reportService } from "../services/reportService";
import type { OperationsDashboard, OperationsDashboardRole } from "../types/dashboard";
import type { ProjectionScope } from "../types/reportingProjection";

/**
 * Operations Dashboard page (data source replaced in Sprint 16 M4.5).
 *
 * Reads live operational data through reportService, which is its only service dependency.
 * It does not import an operational store, the projection layer, or dashboardService, and
 * it performs no aggregation of its own - every value on this page is produced by the
 * Report Service from reporting projections.
 *
 * Before M4.5 this page took its data from React Router location.state, and nothing ever
 * navigated here with state, so every KPI rendered 0 for a real user.
 */

/**
 * REOS has no current-user context yet, so the acting user is fixed here - the same
 * approach ReportsPage and ProofDownloadPage take. The dashboard is an Operations Manager
 * capability (BUSINESS_RULES.md) and that role has enterprise-wide visibility, which is
 * the correct scope for this page. Recorded in TECH_DEBT.md.
 */
const dashboardActor: ProjectionScope = {
  actorUserId: "OPERATIONS_MANAGER",
  actorRole: "OPERATIONS_MANAGER",
  branchId: null,
};

const dashboardRole: OperationsDashboardRole = "OPERATIONS_MANAGER";

export function OperationsDashboardPage() {
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setError(null);

    reportService
      .generateOperationsDashboard(dashboardActor, dashboardRole)
      .then((generated) => {
        if (!cancelled) {
          setDashboard(generated);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setDashboard(null);
          setError(cause instanceof Error ? cause.message : "The dashboard could not be generated.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDrillDown = (path: string) => {
    const targetId = path.split("#")[1];

    if (!targetId) {
      return;
    }

    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const visibleStats = (dashboard?.stats ?? []).filter(
    (stat) => !["USD Value Today", "Revenue Today"].includes(stat.label),
  );

  return (
    <PageContainer>
      <PageHeader
        actions={
          <div className="text-right text-sm text-slate-600">
            <div className="font-medium text-slate-900">Operations Manager</div>
            <div>Updated {formatDateTime(dashboard?.generatedAt ?? new Date().toISOString())}</div>
          </div>
        }
        description="What requires the Operations Manager's attention right now?"
        title="Operations Command Center"
      />

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {(dashboard?.criticalAlerts ?? []).map((alert) => (
          <CriticalAlertCard alert={alert} key={alert.id} onDrillDown={handleDrillDown} />
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleStats.map((stat) => (
          <KpiCard detail={stat.detail} key={stat.id} label={stat.label} value={stat.value} />
        ))}
      </section>

      <BranchPerformanceTable branches={dashboard?.branchPerformance ?? []} />
      <WorkQueueTable items={dashboard?.workQueue ?? []} />
      <ExceptionCenter items={dashboard?.exceptions ?? []} onDrillDown={handleDrillDown} />
      <TodaySummary metrics={dashboard?.todaySummary ?? []} />
    </PageContainer>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
