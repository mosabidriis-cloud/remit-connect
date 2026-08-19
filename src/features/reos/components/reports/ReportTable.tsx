import { useMemo, useState } from "react";
import { BatchLifecycleBadge } from "../BatchLifecycleBadge";
import type { ReportColumn } from "../../types/report";
import type { SharedBatchLifecycleStatus } from "../../types/sharedBatch";
import type { CreditToAccountTransactionStatus } from "../../types/transactionProcessing";

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

  // Which columns are genuinely numeric (for right-alignment/tabular-nums) is not knowable
  // from `columns` alone - report definitions vary per report type - so it's detected from
  // the underlying row values themselves rather than declared per column.
  const numericColumnKeys = useMemo(() => {
    const keys = new Set<string>();

    columns.forEach((column) => {
      if (rows.some((row) => typeof row[column.key] === "number")) {
        keys.add(column.key);
      }
    });

    return keys;
  }, [columns, rows]);

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
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Detail Table</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-900 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
            <tr>
              {columns.length === 0 ? (
                <th className="px-4 py-2.5">Operational Records</th>
              ) : (
                columns.map((column) => (
                  <th
                    className={`px-4 py-2.5 ${numericColumnKeys.has(column.key) ? "text-right" : ""}`}
                    key={column.key}
                  >
                    {column.sortable ? (
                      <button
                        className="rounded font-semibold text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
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
                <tr className="even:bg-slate-50/60 transition-colors hover:bg-blue-50/40" key={getRowKey(row, rowIndex)}>
                  {columns.map((column) => (
                    <td
                      className={`px-4 py-2.5 text-slate-700 ${numericColumnKeys.has(column.key) ? "text-right tabular-nums" : ""}`}
                      key={column.key}
                    >
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
                  <td
                    className={`px-4 py-2.5 ${numericColumnKeys.has(column.key) ? "text-right tabular-nums" : ""}`}
                    key={column.key}
                  >
                    {index === 0 ? "Totals" : totals[column.key as keyof T] ?? ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded border border-slate-300 px-3 py-1.5 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded border border-slate-300 px-3 py-1.5 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
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

  if (isTransactionStatus(value)) {
    return <TransactionStatusBadge status={value} />;
  }

  if (typeof value === "string" && isIsoDate(value)) {
    return formatDateTime(value);
  }

  if (value === null || value === undefined || value === "") {
    return "None";
  }

  return String(value);
}

function TransactionStatusBadge({ status }: { status: CreditToAccountTransactionStatus }) {
  const styles: Record<CreditToAccountTransactionStatus, string> = {
    PENDING: "border-slate-200 bg-slate-50 text-slate-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    RETURNED: "border-red-200 bg-red-50 text-red-700",
  };

  const labels: Record<CreditToAccountTransactionStatus, string> = {
    PENDING: "Pending",
    COMPLETED: "Completed",
    RETURNED: "Returned",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
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

function isTransactionStatus(value: unknown): value is CreditToAccountTransactionStatus {
  return value === "PENDING" || value === "COMPLETED" || value === "RETURNED";
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
