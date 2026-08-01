import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ReportExportActions } from "../components/reports/ReportExportActions";
import { ReportFilters } from "../components/reports/ReportFilters";
import { ReportHeader } from "../components/reports/ReportHeader";
import { ReportSummary } from "../components/reports/ReportSummary";
import { ReportTable } from "../components/reports/ReportTable";
import { reportService } from "../services/reportService";
import type { ReportFilter, ReportMetric, ReportSourceData, VolumeReportRow } from "../types/report";

type ReportsLocationState = ReportSourceData;

export function ReportsPage() {
  const location = useLocation();
  const state = location.state as ReportsLocationState | null;
  const sourceData = useMemo<ReportSourceData>(
    () => ({
      sharedBatches: state?.sharedBatches ?? [],
      processingBatches: state?.processingBatches ?? [],
    }),
    [state],
  );
  const definitions = useMemo(() => reportService.getDefinitions(), []);
  const firstDefinition = definitions[0];
  const [filters, setFilters] = useState<ReportFilter>({
    fromDate: null,
    toDate: null,
    branchId: null,
    batchReference: null,
    reportType: firstDefinition?.type ?? "SHARED_BATCHES",
  });

  const filtersAreValid = reportService.validateFilters(filters);
  const result = useMemo(
    () =>
      filtersAreValid
        ? reportService.createVolumeReportResult(sourceData, filters)
        : null,
    [filters, filtersAreValid, sourceData],
  );
  const selectedDefinition = result?.definition ?? firstDefinition;

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <ReportHeader
        businessQuestion={
          selectedDefinition?.description ??
          "Reusable reporting foundation for approved operational reports."
        }
        category={selectedDefinition?.category ?? "VOLUME"}
        generatedAt={result?.generatedAt ?? new Date().toISOString()}
        name={selectedDefinition?.name ?? "Reports"}
      />

      <ReportFilters
        definitions={definitions}
        filters={filters}
        onChange={setFilters}
      />

      {!filtersAreValid ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The selected date range is invalid.
        </div>
      ) : null}

      <ReportSummary metrics={result?.metrics ?? []} />

      <ReportTable<VolumeReportRow>
        columns={selectedDefinition?.columns ?? []}
        defaultSortKey="date"
        getRowKey={(row) => row.id}
        rows={result?.rows ?? []}
        totals={getTableTotals(result?.totals ?? [])}
      />

      <ReportExportActions />
    </section>
  );
}

function getTableTotals(metrics: ReportMetric[]): Partial<Record<keyof VolumeReportRow, string | number>> {
  return {
    transactionCount: getMetricValue(metrics, "Total Transactions"),
    completedCount: getMetricValue(metrics, "Completed"),
    returnedCount: getMetricValue(metrics, "Returned"),
    proofCount: getMetricValue(metrics, "Proofs"),
  };
}

function getMetricValue(metrics: ReportMetric[], label: string): string | number | undefined {
  return metrics.find((metric) => metric.label === label)?.value;
}
