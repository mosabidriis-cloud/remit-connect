import { BatchLifecycleBadge } from "./BatchLifecycleBadge";
import { colors, radius, shadows, spacing, typography } from "../theme";
import type { BatchDownloadSummary as BatchDownloadSummaryModel } from "../types/proofDownload";

type BatchDownloadSummaryProps = {
  summary: BatchDownloadSummaryModel;
};

export function BatchDownloadSummary({ summary }: BatchDownloadSummaryProps) {
  const completionPercent = summary.transactionCount === 0
    ? 0
    : Math.round((summary.completedTransactionCount / summary.transactionCount) * 100);

  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.sm, padding: spacing.lg }}>
      <div style={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" }}>
        <div>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase" }}>Shared Batch</div>
          <div style={{ color: colors.text, fontSize: typography.h2, fontWeight: 700, marginTop: spacing.xs }}>{summary.sharedBatchReference}</div>
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>Assigned Branch: {summary.assignedBranchId}</div>
        </div>
        <BatchLifecycleBadge status={summary.lifecycleStatus} />
      </div>

      <div style={{ marginTop: spacing.lg }}>
        <div style={{ alignItems: "baseline", display: "flex", justifyContent: "space-between" }}>
          <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>
            {summary.completedTransactionCount} of {summary.transactionCount} transactions completed
          </div>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontVariantNumeric: "tabular-nums" }}>{completionPercent}%</div>
        </div>
        <div style={{ backgroundColor: colors.slate200, borderRadius: radius.sm, height: 8, marginTop: spacing.xs, overflow: "hidden", width: "100%" }}>
          <div style={{ backgroundColor: colors.success, borderRadius: radius.sm, height: "100%", transition: "width 300ms ease", width: `${completionPercent}%` }} />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.lg, marginTop: spacing.lg }}>
        <Stat label="Proof Images Available" value={summary.proofImageCount.toString()} />
        {summary.onHoldTransactionCount > 0 ? (
          <Stat label="On Hold" value={summary.onHoldTransactionCount.toString()} tone="amber" />
        ) : null}
        {summary.returnedTransactionCount > 0 ? (
          <Stat label="Returned Transactions" value={summary.returnedTransactionCount.toString()} tone="red" />
        ) : null}
        {summary.downloadedByUserId ? (
          <Stat label="Downloaded By" value={`${summary.downloadedByUserId}${summary.downloadedAt ? ` • ${formatDateTime(summary.downloadedAt)}` : ""}`} />
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" | "red" }) {
  const toneColor = tone === "amber" ? colors.amber700 : tone === "red" ? colors.red700 : colors.text;

  return (
    <div>
      <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: toneColor, fontSize: typography.small, fontWeight: 600, marginTop: spacing.xs }}>{value}</div>
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
