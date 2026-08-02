import { useEffect, useMemo, useState } from "react";
import { FilterBar } from "../components/common/FilterBar";
import { PageContainer } from "../components/common/PageContainer";
import { ReportExportActions } from "../components/reports/ReportExportActions";
import { ReportFilters } from "../components/reports/ReportFilters";
import { ReportHeader } from "../components/reports/ReportHeader";
import { ReportSummary } from "../components/reports/ReportSummary";
import { ReportTable } from "../components/reports/ReportTable";
import { reportService } from "../services/reportService";
import type { ReportFilter, ReportMetric, ReportResult, ReportRow } from "../types/report";
import type { ProjectionScope } from "../types/reportingProjection";

/**
 * Reports page (Sprint 16 M4.4).
 *
 * Reads live operational data through reportService, which is its only service dependency.
 * It does not import an operational store, the projection layer, or any other service, and
 * it performs no filtering or aggregation of its own - reportService owns both.
 *
 * Before M4.4 this page took its data from React Router location.state, and nothing ever
 * navigated here with state, so every report rendered permanently empty for a real user.
 */

/**
 * REOS has no current-user context yet, so the acting user is fixed here - the same
 * approach ProofDownloadPage already takes for its actor. Reports are an Operations
 * Manager capability (BUSINESS_RULES.md) and that role has enterprise-wide visibility,
 * which is the correct scope for this page. Recorded in TECH_DEBT.md: when a real session
 * actor exists, this constant is what it replaces, and Branch Officer scoping is already
 * enforced by the projection layer for whatever actor it is given.
 */
const reportsActor: ProjectionScope = {
  actorUserId: "OPERATIONS_MANAGER",
  actorRole: "OPERATIONS_MANAGER",
  branchId: null,
};

export function ReportsPage() {
  const definitions = useMemo(() => reportService.getDefinitions(), []);
  const firstDefinition = definitions[0];
  const [filters, setFilters] = useState<ReportFilter>({
    fromDate: null,
    toDate: null,
    branchId: null,
    batchReference: null,
    reportType: firstDefinition?.type ?? "SHARED_BATCHES",
  });
  const [result, setResult] = useState<Readonly<ReportResult<ReportRow>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersAreValid = reportService.validateFilters(filters);
  const selectedDefinition = useMemo(
    () => definitions.find((definition) => definition.type === filters.reportType) ?? firstDefinition,
    [definitions, filters.reportType, firstDefinition],
  );

  useEffect(() => {
    if (!filtersAreValid) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    reportService
      .generateReport(reportsActor, filters)
      .then((generated) => {
        if (!cancelled) {
          setResult(generated);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setResult(null);
          setError(cause instanceof Error ? cause.message : "The report could not be generated.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, filtersAreValid]);

  return (
    <PageContainer>
      <ReportHeader
        businessQuestion={
          selectedDefinition?.description ??
          "Reusable reporting foundation for approved operational reports."
        }
        category={selectedDefinition?.category ?? "VOLUME"}
        generatedAt={result?.generatedAt ?? new Date().toISOString()}
        name={selectedDefinition?.name ?? "Reports"}
      />

      <FilterBar>
        <ReportFilters
          definitions={definitions}
          filters={filters}
          onChange={setFilters}
        />
      </FilterBar>

      {!filtersAreValid ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The selected date range is invalid.
        </div>
      ) : null}

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <ReportSummary metrics={result?.metrics ?? []} />

      <ReportTable<ReportRow>
        columns={selectedDefinition?.columns ?? []}
        getRowKey={getRowKey}
        loading={loading}
        rows={result?.rows ?? []}
        totals={getTableTotals(result?.totals ?? [])}
      />

      <ReportExportActions />
    </PageContainer>
  );
}

/**
 * Rows are already ordered by reportService, so no default sort key is passed to
 * ReportTable - the service's deterministic order stands until a user sorts a column.
 *
 * Identity fields are checked most-specific first, because the projections nest: a proof
 * row also carries queueItemId and sharedBatchId, and a processing row also carries
 * sharedBatchId. Checking a broader field first would give every row in a batch the same
 * key - React then warns about duplicate keys and may drop or duplicate rows.
 */
function getRowKey(row: ReportRow, index: number): string {
  const identity = row.proofId ?? row.queueItemId ?? row.sharedBatchId ?? row.branchId;

  return identity === undefined || identity === null ? String(index) : String(identity);
}

/**
 * Maps report metrics onto the numeric columns they summarize, for ReportTable's totals
 * row. Presentation mapping only - every value here was computed by reportService.
 */
function getTableTotals(metrics: ReportMetric[]): Partial<Record<string, string | number>> {
  const totalTransactions = getMetricValue(metrics, "Total Transactions");
  const completed = getMetricValue(metrics, "Completed");
  const returned = getMetricValue(metrics, "Returned");

  return {
    totalBeneficiaries: totalTransactions,
    completedTransactionCount: completed,
    returnedTransactionCount: returned,
    queueTotal: totalTransactions,
    queueCompleted: completed,
    queueReturned: returned,
    queueRemaining: getMetricValue(metrics, "Remaining"),
    queueOnHold: getMetricValue(metrics, "On Hold"),
    proofCount: getMetricValue(metrics, "Proofs"),
  };
}

function getMetricValue(metrics: ReportMetric[], label: string): string | number | undefined {
  return metrics.find((metric) => metric.label === label)?.value;
}
