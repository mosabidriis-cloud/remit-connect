import { BatchLifecycleBadge } from "./BatchLifecycleBadge";
import type { BatchDownloadSummary as BatchDownloadSummaryModel } from "../types/proofDownload";

type BatchDownloadSummaryProps = {
  summary: BatchDownloadSummaryModel;
};

const emptyValue = "Not recorded";

export function BatchDownloadSummary({ summary }: BatchDownloadSummaryProps) {
  const rows = [
    ["Shared Batch Reference", summary.sharedBatchReference],
    ["Direct Remit Batch Reference", summary.directRemitBatchReference],
    ["Assigned Branch", summary.assignedBranchId],
    ["Number of Transactions", summary.transactionCount.toString()],
    ["Number of Proof Images", summary.proofImageCount.toString()],
    ["Completed Transactions", summary.completedTransactionCount.toString()],
    ["Returned Transactions", summary.returnedTransactionCount.toString()],
    ["Processing Status", <BatchLifecycleBadge status={summary.processingStatus} />],
    ["Download Status", <BatchLifecycleBadge status={summary.downloadStatus} />],
    ["Completed By", summary.completedByUserId ?? emptyValue],
    ["Completed Time", formatDateTime(summary.completedAt)],
    ["Downloaded By", summary.downloadedByUserId ?? emptyValue],
    ["Downloaded Time", formatDateTime(summary.downloadedAt)],
  ] as const;

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-950">Batch Download Summary</h2>
      </div>
      <dl className="grid gap-0 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div className="border-b border-slate-100 px-4 py-3 last:border-b-0 sm:last:border-b" key={label}>
            <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return emptyValue;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
