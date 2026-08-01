import { colors, radius, spacing, typography } from "../theme";
import { StatusBadge } from "./common/StatusBadge";

type ValidationSummaryData = {
  batchReference: string;
  uploadDate: string;
  uploadedBy: string;
  totalRecords: number;
  validRecords: number;
  manualReview: number;
  duplicates: number;
  invalidRecords: number;
  status: string;
  readyForAssignment: boolean;
};

type ValidationSummaryProps = {
  summary: ValidationSummaryData;
};

export function ValidationSummary({ summary }: ValidationSummaryProps) {
  const items = [
    { label: "Batch Reference", value: summary.batchReference },
    { label: "Upload Date", value: summary.uploadDate },
    { label: "Uploaded By", value: summary.uploadedBy },
    { label: "Total Records", value: String(summary.totalRecords) },
    { label: "Valid Records", value: String(summary.validRecords) },
    { label: "Manual Review", value: String(summary.manualReview) },
    { label: "Duplicates", value: String(summary.duplicates) },
    { label: "Invalid Records", value: String(summary.invalidRecords) },
  ];

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Validation Summary</div>
      <div style={{ display: "grid", gap: spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: spacing.md }}>
        {items.map((item) => (
          <div key={item.label}>
            <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{item.label}</div>
            <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: spacing.md, paddingTop: spacing.md }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: spacing.sm }}>
          <span style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Status</span>
          <StatusBadge label={summary.status} tone={summary.readyForAssignment ? "emerald" : "amber"} />
          <span style={{ color: colors.text, fontSize: typography.small }}>
            {summary.readyForAssignment ? "Ready for Assignment" : "Needs review"}
          </span>
        </div>
      </div>
    </div>
  );
}
