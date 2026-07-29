import { useMemo, useState } from "react";
import { BatchLifecycleBadge } from "../BatchLifecycleBadge";
import type { ReportColumn } from "../../types/report";
import type { SharedBatchLifecycleStatus } from "../../types/sharedBatch";

type SortDirection = "asc" | "desc";

type ReportTableProps<T extends Record<string, unknown>> = {
  columns: ReportColumn[];
  rows: T[];
  totals?: Partial<Record<keyof T, string | number>>;
  defaultSortKey?: keyof T;
  loading?: boolean;
  getRowKey: (row: T, index: number) => string;
  renderCell?: (row: T, column: ReportColumn) => React.ReactNode;
};

const pageSize = 10;

export function ReportTable<T extends Record<string, unknown>>({
  columns,
  rows,
  totals,
  defaultSortKey,
  loading = false,
  getRowKey,
  renderCell,
}: ReportTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSortKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      return rows;
    }

    return [...rows].sort((first, second) => {
      const firstValue = first[sortKey];
      const secondValue = second[sortKey];
      const comparison = compareValues(firstValue, secondValue);

      return sortDirection === "asc" ? comparison : comparison * -1;
    });
  }, [rows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSort = (column: ReportColumn) => {
    if (!column.sortable) {
      return;
    }

    setPage(1);
    setSortKey(column.key as keyof T);
    setSortDirection((current) =>
      sortKey === column.key && current === "asc" ? "desc" : "asc",
    );
  };

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-950">Detail Table</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
            <tr>
              {columns.length === 0 ? (
                <th className="px-4 py-3">Operational Records</th>
              ) : (
                columns.map((column) => (
                  <th className="px-4 py-3" key={column.key}>
                    {column.sortable ? (
                      <button
                        className="font-semibold text-slate-600"
                        onClick={() => handleSort(column)}
                        type="button"
                      >
                        {column.title}
                        {sortKey === column.key
                          ? ` ${sortDirection === "asc" ? "Asc" : "Desc"}`
                          : ""}
                      </button>
                    ) : (
                      column.title
                    )}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-slate-600" colSpan={Math.max(columns.length, 1)}>
                  Loading report records...
                </td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-600" colSpan={Math.max(columns.length, 1)}>
                  No operational records match the selected filters.
                </td>
              </tr>
            ) : (
              pagedRows.map((row, rowIndex) => (
                <tr key={getRowKey(row, rowIndex)}>
                  {columns.map((column) => (
                    <td className="px-4 py-3 text-slate-700" key={column.key}>
                      {renderCell ? renderCell(row, column) : formatCellValue(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {totals && columns.length > 0 ? (
            <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
              <tr>
                {columns.map((column, index) => (
                  <td className="px-4 py-3" key={column.key}>
                    {index === 0 ? "Totals" : totals[column.key as keyof T] ?? ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage === totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function compareValues(first: unknown, second: unknown): number {
  if (typeof first === "number" && typeof second === "number") {
    return first - second;
  }

  return String(first ?? "").localeCompare(String(second ?? ""));
}

function formatCellValue(value: unknown): React.ReactNode {
  if (isLifecycleStatus(value)) {
    return <BatchLifecycleBadge status={value} />;
  }

  if (typeof value === "string" && isIsoDate(value)) {
    return formatDateTime(value);
  }

  if (value === null || value === undefined || value === "") {
    return "None";
  }

  return String(value);
}

function isLifecycleStatus(value: unknown): value is SharedBatchLifecycleStatus {
  return (
    value === "ASSIGNED" ||
    value === "PROCESSING" ||
    value === "COMPLETED" ||
    value === "READY_FOR_DOWNLOAD" ||
    value === "DOWNLOADED"
  );
}

function isIsoDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
