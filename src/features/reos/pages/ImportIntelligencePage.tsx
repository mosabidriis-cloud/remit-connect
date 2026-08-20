import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getCoverageMatrix, getDuplicateGroups, getImportHistoryEntries } from "../services/operationalDatasetService";
import { colors, radius, shadows, spacing, typography } from "../theme";
import type { CoverageYearGroup, DuplicateGroup, ImportHistoryEntry } from "../types/operationalDataset";

const tiles: Array<{ label: string; description: string; href: string }> = [
  { label: "Data Coverage", description: "See which months are missing an import before they turn into reporting gaps.", href: "/reos/import-intelligence/coverage" },
  { label: "Import History", description: "Search every import ever recorded and open the exact records it added.", href: "/reos/import-intelligence/history" },
  { label: "Duplicate Management", description: "Review imports flagged as possible duplicates and see exactly why.", href: "/reos/import-intelligence/duplicates" },
  { label: "Historical Performance", description: "Track import volume month over month and year over year.", href: "/reos/import-intelligence/performance" },
];

/**
 * Import Intelligence overview - the landing page for the Operational Dataset
 * (IMPORT_INTELLIGENCE.md Section 13). The operator lands here after Shared Batch
 * Upload's "Recorded in Import Intelligence" link and chooses what to look at; the
 * detail lives in the four pages below, not on this page. Redesigned around what's
 * actually actionable (coverage gaps, flagged duplicates) rather than a "Sources With
 * Data: X / 5" tile that had no basis in the domain model - ImportSource only ever has
 * one real member (DIRECT_REMIT, DEC-029), so a fixed "/ 5" was simply wrong.
 */
export function ImportIntelligencePage() {
  const [entries, setEntries] = useState<ImportHistoryEntry[] | null>(null);
  const [coverage, setCoverage] = useState<CoverageYearGroup[] | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getImportHistoryEntries(), getCoverageMatrix(), getDuplicateGroups()])
      .then(([entriesResult, coverageResult, duplicatesResult]) => {
        if (!cancelled) {
          setEntries(entriesResult);
          setCoverage(coverageResult);
          setDuplicateGroups(duplicatesResult);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load Import Intelligence.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeEntries = entries?.filter((entry) => entry.duplicateStatus !== "REPLACED") ?? [];
  const periodsCovered = new Set(activeEntries.map((entry) => entry.reportingPeriod)).size;
  const transactionsImported = activeEntries.reduce((total, entry) => total + entry.transactionCount, 0);
  const gapCount = coverage?.flatMap((year) => year.months).flatMap((month) => month.cells).filter((cell) => cell.status === "MISSING" || cell.status === "INCOMPLETE").length ?? 0;
  const duplicateCount = duplicateGroups?.length ?? 0;
  const isLoaded = entries && coverage && duplicateGroups;

  return (
    <PageContainer>
      <PageHeader
        description="The permanent record of every file ever imported into REOS - what's covered, what's missing, and what needs a second look."
        title="Import Intelligence"
      />

      {error ? (
        <div style={{ backgroundColor: colors.red50, border: "1px solid #FCA5A5", borderRadius: radius.sm, color: colors.red700, padding: spacing.lg }}>{error}</div>
      ) : null}

      {!isLoaded ? (
        <LoadingState message="Loading summary..." />
      ) : (
        <div style={{ display: "grid", gap: spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <SummaryTile label="Imports Recorded" value={String(entries.length)} sublabel={`across ${periodsCovered} reporting period${periodsCovered === 1 ? "" : "s"}`} />
          <SummaryTile label="Transactions Imported" value={transactionsImported.toLocaleString()} sublabel="from active, non-duplicate imports" />
          <AttentionTile
            count={gapCount}
            drillDownHref="/reos/import-intelligence/coverage"
            drillDownLabel="Review Data Coverage"
            label="Coverage Gaps"
            okMessage="Every month in range has a complete import."
            problemMessage={`month${gapCount === 1 ? "" : "s"} missing or incomplete - transactions for that period never reached REOS.`}
          />
          <AttentionTile
            count={duplicateCount}
            drillDownHref="/reos/import-intelligence/duplicates"
            drillDownLabel="Review Duplicates"
            label="Duplicate Groups"
            okMessage="No imports have been flagged as possible duplicates."
            problemMessage={`group${duplicateCount === 1 ? "" : "s"} of imports look like duplicates and haven't been resolved.`}
          />
        </div>
      )}

      <div style={{ display: "grid", gap: spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text, display: "block", padding: spacing.lg, textDecoration: "none" }}
            to={tile.href}
          >
            <div style={{ color: colors.primary, fontSize: typography.h3, fontWeight: 600 }}>{tile.label}</div>
            <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>{tile.description}</div>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}

function SummaryTile({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.sm, padding: spacing.lg }}>
      <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: colors.text, fontSize: typography.h1, fontWeight: 700, marginTop: spacing.xs }}>{value}</div>
      <div style={{ color: colors.muted, fontSize: typography.caption, marginTop: spacing.xs }}>{sublabel}</div>
    </div>
  );
}

/** Mirrors the Operations Dashboard's Exception Center tiles (amber accent when it needs a look, emerald when clear) so the two "what needs my attention" surfaces in REOS read the same way. */
function AttentionTile({
  label,
  count,
  problemMessage,
  okMessage,
  drillDownLabel,
  drillDownHref,
}: {
  label: string;
  count: number;
  problemMessage: string;
  okMessage: string;
  drillDownLabel: string;
  drillDownHref: string;
}) {
  const hasIssue = count > 0;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${hasIssue ? colors.warning : colors.success}`,
        borderRadius: radius.lg,
        boxShadow: shadows.sm,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: colors.text, fontSize: typography.h1, fontWeight: 700, marginTop: spacing.xs }}>{count}</div>
      <div style={{ color: colors.muted, fontSize: typography.caption, marginTop: spacing.xs, minHeight: 32 }}>
        {hasIssue ? `${count} ${problemMessage}` : okMessage}
      </div>
      {hasIssue ? (
        <Link style={{ color: colors.primary, display: "inline-block", fontSize: typography.small, fontWeight: 600, marginTop: spacing.sm, textDecoration: "none" }} to={drillDownHref}>
          {drillDownLabel} →
        </Link>
      ) : null}
    </div>
  );
}
