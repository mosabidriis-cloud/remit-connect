import { colors, radius, spacing, typography } from "../theme";
import { StatusBadge } from "./common/StatusBadge";

type BatchSummaryData = {
  batchReference: string;
  fileName: string;
  totalRecords: number;
  validRecords: number;
  status: string;
  readyForAssignment: boolean;
};

type BatchSummaryProps = {
  summary: BatchSummaryData;
};

export function BatchSummary({ summary }: BatchSummaryProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.md, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>{summary.batchReference}</div>
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>{summary.fileName}</div>
        </div>
        <StatusBadge label={summary.readyForAssignment ? "Ready for Assignment" : "Pending Review"} tone={summary.readyForAssignment ? "emerald" : "amber"} />
      </div>
      <div style={{ display: "grid", gap: spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: spacing.lg }}>
        <div>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Status</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.status}</div>
        </div>
        <div>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Total Records</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.totalRecords}</div>
        </div>
        <div>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Valid Records</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.validRecords}</div>
        </div>
      </div>
    </div>
  );
}
