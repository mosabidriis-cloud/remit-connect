import { useMemo, useState } from "react";
import { ReportExportActions } from "../components/reports/ReportExportActions";
import { ReportFilters } from "../components/reports/ReportFilters";
import { ReportHeader } from "../components/reports/ReportHeader";
import { ReportSummary } from "../components/reports/ReportSummary";
import { ReportTable } from "../components/reports/ReportTable";
import { reportService } from "../services/reportService";
import type { ReportFilter } from "../types/report";

const defaultGeneratedAt = new Date().toISOString();

export function ReportsPage() {
  const definitions = useMemo(() => reportService.getDefinitions(), []);
  const firstDefinition = definitions[0];
  const [filters, setFilters] = useState<ReportFilter>({
    fromDate: null,
    toDate: null,
    branchId: null,
    reportType: firstDefinition?.type ?? "SHARED_BATCHES",
    lifecycleStatus: null,
  });

  const selectedDefinition =
    definitions.find((definition) => definition.type === filters.reportType) ??
    firstDefinition;

  return (
    <section className="grid gap-6 p-4">
      <ReportHeader
        businessQuestion={
          selectedDefinition?.description ??
          "Reusable reporting foundation for approved operational reports."
        }
        category={selectedDefinition?.category ?? "VOLUME"}
        generatedAt={defaultGeneratedAt}
        name={selectedDefinition?.name ?? "Reports"}
      />

      <ReportFilters
        definitions={definitions}
        filters={filters}
        onChange={setFilters}
      />

      {!reportService.validateFilters(filters) ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          The selected date range is invalid.
        </div>
      ) : null}

      <ReportSummary metrics={[]} />

      <ReportTable<Record<string, unknown>>
        columns={selectedDefinition?.columns ?? []}
        getRowKey={(_, index) => String(index)}
        rows={[]}
      />

      <ReportExportActions />
    </section>
  );
}
