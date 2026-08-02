import { BatchLifecycleBadge } from "./BatchLifecycleBadge";
import { colors, radius, spacing, typography } from "../theme";
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
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md }}>
      <div style={{ borderBottom: `1px solid ${colors.border}`, padding: `${spacing.md}px ${spacing.lg}px` }}>
        <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Batch Download Summary</h2>
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {rows.map(([label, value]) => (
          <div key={label as string} style={{ borderTop: `1px solid ${colors.slate100}`, padding: `${spacing.md}px ${spacing.lg}px` }}>
            <dt style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</dt>
            <dd style={{ color: colors.text, fontSize: typography.small, fontWeight: 500, marginTop: spacing.xs }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
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
