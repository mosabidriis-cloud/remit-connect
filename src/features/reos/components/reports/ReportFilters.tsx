import type { ChangeEvent } from "react";
import type { ReportDefinition, ReportFilter } from "../../types/report";

type ReportFiltersProps = {
  definitions: ReportDefinition[];
  filters: ReportFilter;
  onChange: (filters: ReportFilter) => void;
};

export function ReportFilters({
  definitions,
  filters,
  onChange,
}: ReportFiltersProps) {
  const handleTextFieldChange =
    (field: "fromDate" | "toDate" | "branchId" | "batchReference") =>
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

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <span className="font-medium text-slate-700">Batch Reference</span>
          <input
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
            onChange={handleTextFieldChange("batchReference")}
            placeholder="Batch reference"
            type="search"
            value={filters.batchReference ?? ""}
          />
        </label>
      </div>
    </section>
  );
}
