import type { ChangeEvent } from "react";
import type { ReportDefinition, ReportFilter } from "../../types/report";
import type { SharedBatchLifecycleStatus } from "../../types/sharedBatch";

type ReportFiltersProps = {
  definitions: ReportDefinition[];
  filters: ReportFilter;
  onChange: (filters: ReportFilter) => void;
};

const lifecycleStatuses: SharedBatchLifecycleStatus[] = [
  "ASSIGNED",
  "PROCESSING",
  "COMPLETED",
  "READY_FOR_DOWNLOAD",
  "DOWNLOADED",
];

export function ReportFilters({
  definitions,
  filters,
  onChange,
}: ReportFiltersProps) {
  const handleTextFieldChange =
    (field: "fromDate" | "toDate" | "branchId") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({
        ...filters,
        [field]: event.target.value || null,
      });
    };

  const handleReportTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const definition = definitions.find(
      (item) => item.type === event.target.value,
    );

    if (!definition) {
      return;
    }

    onChange({
      ...filters,
      reportType: definition.type,
    });
  };

  const handleLifecycleStatusChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    onChange({
      ...filters,
      lifecycleStatus: (event.target.value || null) as SharedBatchLifecycleStatus | null,
    });
  };

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Report</span>
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            disabled={definitions.length === 0}
            onChange={handleReportTypeChange}
            value={filters.reportType}
          >
            {definitions.length === 0 ? (
              <option value={filters.reportType}>No reports registered</option>
            ) : (
              definitions.map((definition) => (
                <option key={definition.id} value={definition.type}>
                  {definition.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Date From</span>
          <input
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
            onChange={handleTextFieldChange("fromDate")}
            type="date"
            value={filters.fromDate ?? ""}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Date To</span>
          <input
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
            onChange={handleTextFieldChange("toDate")}
            type="date"
            value={filters.toDate ?? ""}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Branch</span>
          <input
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
            onChange={handleTextFieldChange("branchId")}
            placeholder="Branch ID"
            type="search"
            value={filters.branchId ?? ""}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Lifecycle Status</span>
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            onChange={handleLifecycleStatusChange}
            value={filters.lifecycleStatus ?? ""}
          >
            <option value="">All statuses</option>
            {lifecycleStatuses.map((status) => (
              <option key={status} value={status}>
                {formatLifecycleStatus(status)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

function formatLifecycleStatus(status: SharedBatchLifecycleStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
