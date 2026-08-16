import { colors, radius, spacing, typography } from "../theme";
import type { ImportBatchRecord } from "../types/importIntelligence";

type DuplicateImportDialogProps = {
  open: boolean;
  matches: ImportBatchRecord[];
  onReplace: () => void;
  onMerge: () => void;
  onCancel: () => void;
};

/**
 * Shown when checkForDuplicateImport finds a prior import with the same file checksum
 * or the same batch reference + reporting period (IMPORT_INTELLIGENCE.md Section 5).
 * "View Existing" is not a separate action here - the matching import's own detail is
 * always shown inline, so there is nothing further to navigate to before deciding.
 */
export function DuplicateImportDialog({ open, matches, onReplace, onMerge, onCancel }: DuplicateImportDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: "rgba(2, 6, 23, 0.45)",
        display: "flex",
        inset: 0,
        justifyContent: "center",
        padding: spacing.lg,
        position: "fixed",
        zIndex: 1000,
      }}
    >
      <div style={{ backgroundColor: colors.surface, borderRadius: radius.md, maxWidth: 560, padding: spacing.xl, width: "100%" }}>
        <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Possible Duplicate Import</div>
        <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
          This file or batch reference has been imported before. Choose how to proceed - nothing is imported silently.
        </p>

        <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
          {matches.map((match) => (
            <div key={match.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.md }}>
              <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{match.batchReference}</div>
              <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                {match.fileName} - {match.reportingPeriod} - {match.transactionCount} transaction{match.transactionCount === 1 ? "" : "s"}
              </div>
              <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                Uploaded {new Date(match.uploadTimestamp).toLocaleString()} by {match.uploadedByUserId}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.lg }}>
          <button
            onClick={onCancel}
            style={{ backgroundColor: colors.slate100, border: "none", borderRadius: radius.sm, color: colors.text, cursor: "pointer", padding: `${spacing.sm}px ${spacing.lg}px` }}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={onMerge}
            style={{ backgroundColor: colors.slate100, border: "none", borderRadius: radius.sm, color: colors.text, cursor: "pointer", padding: `${spacing.sm}px ${spacing.lg}px` }}
            type="button"
          >
            Merge (skip already-recorded references)
          </button>
          <button
            onClick={onReplace}
            style={{ backgroundColor: colors.primary, border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", padding: `${spacing.sm}px ${spacing.lg}px` }}
            type="button"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}
