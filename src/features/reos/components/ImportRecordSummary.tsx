import { colors, radius, spacing, typography } from "../theme";
import type { ImportBatchRecord } from "../types/importIntelligence";
import type { CoverageImpact } from "../types/operationalDataset";

type ImportRecordSummaryProps = {
  batch: ImportBatchRecord;
  /** Omitted while still being computed, or when the caller has no coverage-impact context to show. */
  coverageImpact?: CoverageImpact;
};

const coverageImpactLabel: Record<CoverageImpact, string> = {
  FIRST_FOR_PERIOD: "Filled a coverage gap",
  ADDITIONAL: "Added onto existing coverage",
};

/**
 * The Import Experience field grid (IMPORT_INTELLIGENCE.md Section 13): everything the
 * operator should see immediately after an import - Reporting Period, Business Date
 * range, Source, count, total, duplicate status, and coverage impact. Shared between
 * the post-import banner (Shared Batch Upload) and Import History's per-batch detail
 * page, so the two never drift into two different summaries of the same record.
 */
export function ImportRecordSummary({ batch, coverageImpact }: ImportRecordSummaryProps) {
  const fields: Array<[string, string]> = [
    ["Reporting Period", batch.reportingPeriod],
    ["Business Date Range", batch.businessDateMin && batch.businessDateMax ? `${batch.businessDateMin} to ${batch.businessDateMax}` : "—"],
    ["Source", batch.source],
    ["Transactions", String(batch.transactionCount)],
    ["Total Amount", batch.totalAmount !== null && batch.currency ? `${batch.totalAmount.toLocaleString()} ${batch.currency}` : "Mixed currency - not summed"],
    ["Duplicate Status", batch.duplicateStatus],
    [
      "Validation Outcome",
      batch.validRecordCount !== null
        ? `${batch.validRecordCount} valid / ${batch.invalidRecordCount ?? 0} invalid / ${batch.manualReviewRecordCount ?? 0} manual review`
        : "Not recorded",
    ],
  ];

  if (coverageImpact) {
    fields.push(["Coverage Impact", coverageImpactLabel[coverageImpact]]);
  }

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        display: "grid",
        gap: spacing.sm,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        padding: spacing.lg,
      }}
    >
      {fields.map(([label, value]) => (
        <div key={label}>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: 2 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}
