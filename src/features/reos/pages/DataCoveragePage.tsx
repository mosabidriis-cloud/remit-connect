import { useEffect, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getCoverageMatrix } from "../services/operationalDatasetService";
import { colors, radius, spacing, typography } from "../theme";
import type { CoverageCell, CoverageCellStatus, CoverageYearGroup } from "../types/operationalDataset";
import type { ImportSource } from "../types/importIntelligence";

const SOURCE_ORDER: ImportSource[] = ["DIRECT_REMIT", "WESTERN_UNION", "RIA", "MONEYGRAM", "TERRAPAY"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const statusPresentation: Record<CoverageCellStatus, { label: string; symbol: string; color: string }> = {
  MISSING: { label: "Missing", symbol: "—", color: colors.slate200 },
  IMPORTED: { label: "Imported", symbol: "✓", color: colors.emerald700 },
  INCOMPLETE: { label: "Incomplete", symbol: "◐", color: colors.amber700 },
  DUPLICATE: { label: "Duplicate", symbol: "⚠", color: colors.red700 },
};

/**
 * Data Coverage: Year -> Month -> Source, generated entirely from the Import Ledger via
 * operationalDatasetService.getCoverageMatrix() (IMPORT_INTELLIGENCE.md Section 13).
 * Only DIRECT_REMIT is ever populated - the other four sources render as permanently
 * MISSING, honestly, since REOS has never imported anything from them.
 */
export function DataCoveragePage() {
  const [years, setYears] = useState<CoverageYearGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCoverageMatrix()
      .then((result) => {
        if (!cancelled) {
          setYears(result);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load Data Coverage.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer>
      <PageHeader
        description="Every reporting period and source, and whether real data exists for it. Generated entirely from the Import Ledger."
        title="Data Coverage"
      />

      {error ? (
        <div style={{ backgroundColor: colors.red50, border: `1px solid #FCA5A5`, borderRadius: radius.sm, color: colors.red700, padding: spacing.lg }}>{error}</div>
      ) : null}

      <Legend />

      {!years ? (
        <LoadingState message="Loading coverage..." />
      ) : years.every((year) => year.months.every((row) => row.cells.every((cell) => cell.status === "MISSING"))) ? (
        <EmptyState message="No imports have been recorded yet, so there is no coverage to show." />
      ) : (
        <div style={{ display: "grid", gap: spacing.lg }}>
          {years.map((yearGroup) => (
            <YearTable key={yearGroup.year} yearGroup={yearGroup} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.lg }}>
      {(Object.keys(statusPresentation) as CoverageCellStatus[]).map((status) => {
        const presentation = statusPresentation[status];

        return (
          <div key={status} style={{ alignItems: "center", color: colors.muted, display: "flex", fontSize: typography.small, gap: spacing.xs }}>
            <span style={{ color: presentation.color, fontWeight: 700 }}>{presentation.symbol}</span>
            {presentation.label}
          </div>
        );
      })}
    </div>
  );
}

function YearTable({ yearGroup }: { yearGroup: CoverageYearGroup }) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.sm, overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", color: colors.text, minWidth: "100%" }}>
        <thead style={{ backgroundColor: colors.slate50, color: colors.muted, fontSize: typography.caption, fontWeight: 600, textAlign: "left", textTransform: "uppercase" }}>
          <tr>
            <th style={{ padding: `${spacing.md}px ${spacing.lg}px`, textAlign: "left" }}>{yearGroup.year}</th>
            {SOURCE_ORDER.map((source) => (
              <th key={source} style={{ padding: `${spacing.md}px ${spacing.lg}px`, textAlign: "center" }}>
                {source}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yearGroup.months.map((row) => (
            <tr key={row.period} style={{ borderTop: `1px solid ${colors.slate100}` }}>
              <td style={{ color: colors.slate700, fontWeight: 600, padding: `${spacing.md}px ${spacing.lg}px` }}>{MONTH_NAMES[row.month - 1]}</td>
              {row.cells.map((cell) => (
                <CoverageStatusCell cell={cell} key={cell.source} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CoverageStatusCell({ cell }: { cell: CoverageCell }) {
  const presentation = statusPresentation[cell.status];
  const title =
    cell.status === "MISSING"
      ? "No data imported for this period"
      : `${presentation.label} - ${cell.batchCount} batch(es) ever recorded, ${cell.activeTransactionCount} active transaction(s)`;

  return (
    <td style={{ color: presentation.color, fontWeight: 600, padding: `${spacing.md}px ${spacing.lg}px`, textAlign: "center" }} title={title}>
      {presentation.symbol}
    </td>
  );
}
