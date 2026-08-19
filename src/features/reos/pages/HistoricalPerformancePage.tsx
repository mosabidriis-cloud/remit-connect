import { useEffect, useState } from "react";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getHistoricalPerformance } from "../services/operationalDatasetService";
import { colors, radius, shadows, spacing, typography } from "../theme";
import type { HistoricalPerformanceResult, PeriodPerformance, SourceTotals } from "../types/operationalDataset";

/**
 * Historical Performance (IMPORT_INTELLIGENCE.md Section 13): Month-over-Month and
 * Year-over-Year transaction growth, and Source comparison, derived entirely from the
 * Import Ledger - no manual reporting session, no operator-chosen period. Branch
 * comparison is deliberately not offered: the ledger records what was imported, not
 * how it was later assigned to a branch, which is a live-workflow event this layer
 * does not read (see the page note below).
 */
export function HistoricalPerformancePage() {
  const [result, setResult] = useState<HistoricalPerformanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getHistoricalPerformance()
      .then((data) => {
        if (!cancelled) {
          setResult(data);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load Historical Performance.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasData = result?.periods.some((period) => period.transactionCount > 0) ?? false;

  return (
    <PageContainer>
      <PageHeader description="Volume and transaction trends across every reporting period, derived automatically from the Import Ledger." title="Historical Performance" />

      {error ? (
        <div style={{ backgroundColor: colors.red50, border: "1px solid #FCA5A5", borderRadius: radius.sm, color: colors.red700, padding: spacing.lg }}>{error}</div>
      ) : null}

      <div style={{ backgroundColor: colors.blue50, border: "1px solid #BFDBFE", borderRadius: radius.sm, color: colors.blue700, fontSize: typography.small, padding: spacing.md }}>
        Branch comparison is not shown here - the Import Ledger records what was imported, not how it was later assigned to a branch. For branch-scoped data, see Reports.
      </div>

      {!result ? (
        <LoadingState message="Loading historical performance..." />
      ) : !hasData ? (
        <EmptyState message="No imports have been recorded yet, so there are no trends to show." />
      ) : (
        <>
          <section>
            <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600, marginBottom: spacing.sm }}>Volume &amp; Transaction Trends</h2>
            <PeriodTable periods={result.periods} />
          </section>

          <section style={{ marginTop: spacing.xl }}>
            <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600, marginBottom: spacing.sm }}>Source Comparison</h2>
            <SourceTable sources={result.sourceComparison} />
          </section>
        </>
      )}
    </PageContainer>
  );
}

function PeriodTable({ periods }: { periods: PeriodPerformance[] }) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.sm, overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", color: colors.text, minWidth: "100%" }}>
        <thead
          style={{
            backgroundColor: colors.slate900,
            color: colors.slate300,
            fontSize: typography.caption,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textAlign: "left",
            textTransform: "uppercase",
          }}
        >
          <tr>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px` }}>Period</th>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>Batches</th>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>Transactions</th>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>MoM Growth</th>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>YoY Growth</th>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px` }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period, index) => (
            <tr
              key={period.period}
              style={{ backgroundColor: index % 2 === 1 ? colors.slate50 : colors.surface, borderTop: `1px solid ${colors.slate100}` }}
            >
              <td style={{ color: colors.slate700, fontWeight: 600, padding: `${spacing.sm}px ${spacing.lg}px` }}>{period.period}</td>
              <td style={{ color: colors.slate700, fontVariantNumeric: "tabular-nums", padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>{period.batchCount}</td>
              <td style={{ color: colors.slate700, fontVariantNumeric: "tabular-nums", padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>{period.transactionCount}</td>
              <td style={{ fontVariantNumeric: "tabular-nums", padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>
                <GrowthValue value={period.momGrowthPercent} />
              </td>
              <td style={{ fontVariantNumeric: "tabular-nums", padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>
                <GrowthValue value={period.yoyGrowthPercent} />
              </td>
              <td style={{ color: colors.slate700, fontVariantNumeric: "tabular-nums", padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>
                {period.amountsByCurrency.length === 0
                  ? "—"
                  : period.amountsByCurrency.map((entry) => `${entry.totalAmount.toLocaleString()} ${entry.currency}`).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GrowthValue({ value }: { value: number | null }) {
  if (value === null) {
    return <span style={{ color: colors.slate200 }}>N/A</span>;
  }

  const color = value > 0 ? colors.emerald700 : value < 0 ? colors.red700 : colors.muted;

  return (
    <span style={{ color, fontWeight: 600 }}>
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function SourceTable({ sources }: { sources: SourceTotals[] }) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.sm, overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", color: colors.text, minWidth: "100%" }}>
        <thead
          style={{
            backgroundColor: colors.slate900,
            color: colors.slate300,
            fontSize: typography.caption,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textAlign: "left",
            textTransform: "uppercase",
          }}
        >
          <tr>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px` }}>Source</th>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>Batches</th>
            <th style={{ padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>Transactions</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source, index) => (
            <tr
              key={source.source}
              style={{ backgroundColor: index % 2 === 1 ? colors.slate50 : colors.surface, borderTop: `1px solid ${colors.slate100}` }}
            >
              <td style={{ color: source.batchCount > 0 ? colors.slate700 : colors.slate200, fontWeight: 600, padding: `${spacing.sm}px ${spacing.lg}px` }}>{source.source}</td>
              <td style={{ color: colors.slate700, fontVariantNumeric: "tabular-nums", padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>{source.batchCount}</td>
              <td style={{ color: colors.slate700, fontVariantNumeric: "tabular-nums", padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: "right" }}>{source.transactionCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
