import { useEffect, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getDuplicateGroups } from "../services/operationalDatasetService";
import { colors, radius, spacing, typography } from "../theme";
import type { ImportBatchRecord } from "../types/importIntelligence";
import type { DuplicateGroup, DuplicateReason } from "../types/operationalDataset";

const reasonLabel: Record<DuplicateReason, string> = {
  SAME_FILE_CHECKSUM: "Same file, byte for byte",
  SAME_BATCH_REFERENCE_AND_PERIOD: "Same batch reference and reporting period",
  REPLACEMENT_CHAIN: "One explicitly replaced or merged into the other",
};

const statusTone: Record<ImportBatchRecord["duplicateStatus"], string> = {
  UNIQUE: colors.emerald700,
  REPLACED: colors.muted,
  MERGED: colors.amber700,
};

/**
 * Duplicate Management (IMPORT_INTELLIGENCE.md Section 13): every group of related
 * imports, why they were flagged, and their outcome - a read/audit surface, not a
 * second place to trigger Replace/Merge. Those actions only make sense against a
 * specific incoming file being checked against the ledger, which is why they live at
 * the point of upload (Shared Batch Upload's duplicate dialog), not here after the
 * fact - there is no "replace with nothing" to retroactively apply to a past import.
 */
export function DuplicateManagementPage() {
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDuplicateGroups()
      .then((result) => {
        if (!cancelled) {
          setGroups(result);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load duplicate imports.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer>
      <PageHeader
        description="Every group of related imports and why they were flagged as duplicates. Replace and Merge happen at the moment of upload, against a specific new file - see Shared Batch Upload."
        title="Duplicate Management"
      />

      {error ? (
        <div style={{ backgroundColor: colors.red50, border: "1px solid #FCA5A5", borderRadius: radius.sm, color: colors.red700, padding: spacing.lg }}>{error}</div>
      ) : null}

      {!groups ? (
        <LoadingState message="Loading duplicate imports..." />
      ) : groups.length === 0 ? (
        <EmptyState message="No duplicate imports have been detected." />
      ) : (
        <div style={{ display: "grid", gap: spacing.lg }}>
          {groups.map((group) => (
            <DuplicateGroupCard group={group} key={group.id} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function DuplicateGroupCard({ group }: { group: DuplicateGroup }) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.lg }}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>
          {group.source} · {group.reportingPeriod}
        </div>
        <div style={{ color: colors.muted, fontSize: typography.small }}>{group.batches.length} imports</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
        {group.reasons.map((reason) => (
          <span
            key={reason}
            style={{ backgroundColor: colors.amber50, borderRadius: radius.sm, color: colors.amber700, fontSize: typography.caption, fontWeight: 600, padding: `${spacing.xs}px ${spacing.sm}px` }}
          >
            {reasonLabel[reason]}
          </span>
        ))}
      </div>

      <div style={{ marginTop: spacing.md, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: "100%" }}>
          <thead style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textAlign: "left", textTransform: "uppercase" }}>
            <tr>
              <th style={{ padding: `${spacing.sm}px ${spacing.md}px` }}>Batch Reference</th>
              <th style={{ padding: `${spacing.sm}px ${spacing.md}px` }}>File</th>
              <th style={{ padding: `${spacing.sm}px ${spacing.md}px`, textAlign: "right" }}>Transactions</th>
              <th style={{ padding: `${spacing.sm}px ${spacing.md}px` }}>Status</th>
              <th style={{ padding: `${spacing.sm}px ${spacing.md}px` }}>Uploaded</th>
              <th style={{ padding: `${spacing.sm}px ${spacing.md}px` }}>By</th>
            </tr>
          </thead>
          <tbody>
            {group.batches.map((batch) => (
              <tr key={batch.id} style={{ borderTop: `1px solid ${colors.slate100}`, fontSize: typography.small }}>
                <td style={{ color: colors.text, fontWeight: 600, padding: `${spacing.sm}px ${spacing.md}px` }}>{batch.batchReference}</td>
                <td style={{ color: colors.slate700, padding: `${spacing.sm}px ${spacing.md}px` }}>{batch.fileName}</td>
                <td style={{ color: colors.slate700, padding: `${spacing.sm}px ${spacing.md}px`, textAlign: "right" }}>{batch.transactionCount}</td>
                <td style={{ color: statusTone[batch.duplicateStatus], fontWeight: 600, padding: `${spacing.sm}px ${spacing.md}px` }}>{batch.duplicateStatus}</td>
                <td style={{ color: colors.slate700, padding: `${spacing.sm}px ${spacing.md}px` }}>{new Date(batch.uploadTimestamp).toLocaleString()}</td>
                <td style={{ color: colors.slate700, padding: `${spacing.sm}px ${spacing.md}px` }}>{batch.uploadedByUserId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
