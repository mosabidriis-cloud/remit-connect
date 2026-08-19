import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BranchPerformanceTable } from "../components/BranchPerformanceTable";
import { KpiCard } from "../components/common/KpiCard";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { CriticalAlertCard } from "../components/CriticalAlertCard";
import { ExceptionCenter } from "../components/ExceptionCenter";
import { TodaySummary } from "../components/TodaySummary";
import { WorkQueueTable } from "../components/WorkQueueTable";
import { useReosSession } from "../layout/reosAuthContext";
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

export function OperationsDashboardPage() {
  const { session } = useReosSession();
  const location = useLocation();
  const [dashboard, setDashboard] = useState<OperationsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    // This route is RoleGate'd to OPERATIONS_MANAGER only (AUTHENTICATION.md Section 6).
    const dashboardActor: ProjectionScope = { actorUserId: session.userId, actorRole: session.role, branchId: session.branchId };
    const dashboardRole: OperationsDashboardRole = "OPERATIONS_MANAGER";

    (async () => {
      // Deferred past the current synchronous effect tick so the error-reset below never
      // runs synchronously within the effect body itself.
      await Promise.resolve();

      if (!cancelled) {
        setError(null);
      }

      try {
        const generated = await reportService.generateOperationsDashboard(dashboardActor, dashboardRole);

        if (!cancelled) {
          setDashboard(generated);
        }
      } catch (cause) {
        if (!cancelled) {
          setDashboard(null);
          setError(cause instanceof Error ? cause.message : "The dashboard could not be generated.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Lets the Command Palette (and any other external link) deep-link straight to a
  // section, e.g. /reos/dashboard#exception-center - the target only exists once
  // `dashboard` has loaded, so this can't run until then.
  useEffect(() => {
    if (!dashboard || !location.hash) {
      return;
    }

    const targetId = location.hash.slice(1);

    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [dashboard, location.hash]);

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
        description="Branch performance, work queue, and exceptions requiring attention."
        title="Operations Dashboard"
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm shadow-red-100">
          {error}
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Critical Alerts</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {(dashboard?.criticalAlerts ?? []).map((alert) => (
            <CriticalAlertCard alert={alert} key={alert.id} onDrillDown={handleDrillDown} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Key Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleStats.map((stat) => (
            <KpiCard
              detail={stat.detail}
              key={stat.id}
              label={stat.label}
              value={stat.value}
              variant={stat.id === "transactions-today" ? "anchor" : "default"}
            />
          ))}
        </div>
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
