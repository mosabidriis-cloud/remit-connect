import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getImportHistoryEntries } from "../services/operationalDatasetService";
import { colors, radius, spacing, typography } from "../theme";
import type { ImportHistoryEntry } from "../types/operationalDataset";

const tiles: Array<{ label: string; description: string; href: string }> = [
  { label: "Data Coverage", description: "Year -> Month -> Source, and what's missing, incomplete, or duplicated.", href: "/reos/import-intelligence/coverage" },
  { label: "Import History", description: "Every import ever recorded, filterable, with a link to its imported dataset.", href: "/reos/import-intelligence/history" },
  { label: "Duplicate Management", description: "Every group of related imports, and why they were flagged.", href: "/reos/import-intelligence/duplicates" },
  { label: "Historical Performance", description: "Month-over-Month and Year-over-Year trends, and source comparison.", href: "/reos/import-intelligence/performance" },
];

/**
 * Import Intelligence overview - the landing page for the Operational Dataset
 * (IMPORT_INTELLIGENCE.md Section 13). The operator lands here after Shared Batch
 * Upload's "Recorded in Import Intelligence" link and chooses what to look at; the
 * detail lives in the four pages below, not on this page.
 */
export function ImportIntelligencePage() {
  const [entries, setEntries] = useState<ImportHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getImportHistoryEntries()
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
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
  const sourcesCovered = new Set(activeEntries.map((entry) => entry.source)).size;

  return (
    <PageContainer>
      <PageHeader
        description="Every import, ever - what exists, what's missing, and what was uploaded when. Survives a reload. This is REOS's Operational Dataset."
        title="Import Intelligence"
      />

      {error ? (
        <div style={{ backgroundColor: colors.red50, border: "1px solid #FCA5A5", borderRadius: radius.sm, color: colors.red700, padding: spacing.lg }}>{error}</div>
      ) : null}

      {!entries ? (
        <LoadingState message="Loading summary..." />
      ) : (
        <div style={{ display: "grid", gap: spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <SummaryTile label="Imports Recorded" value={String(entries.length)} />
          <SummaryTile label="Reporting Periods Covered" value={String(periodsCovered)} />
          <SummaryTile label="Sources With Data" value={`${sourcesCovered} / 5`} />
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.lg }}>
      <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: colors.text, fontSize: typography.h1, fontWeight: 700, marginTop: spacing.xs }}>{value}</div>
    </div>
  );
}
