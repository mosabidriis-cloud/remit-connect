import type { ImportBatchRecord, ImportBeneficiaryRecord, ImportSource } from "./importIntelligence";

/**
 * Operational Dataset (docs/AI/IMPORT_INTELLIGENCE.md Section 13).
 *
 * The read layer above Import Intelligence: every type here is derived, in memory,
 * from `importIntelligenceService.getImportHistory()` - no second Supabase query path,
 * no new table. It is the single source of truth for Reports/Dashboards/Coverage/
 * Historical Analytics/Duplicate Management, by explicit, narrower scope than the
 * literal request that prompted it: Branch Processing and Liquidity Management keep
 * their own live in-memory state and do not read through this layer (confirmed
 * decision, 2026-08-08 - see CURRENT_SPRINT.md).
 */

export type CoverageCellStatus = "MISSING" | "IMPORTED" | "INCOMPLETE" | "DUPLICATE";

export interface CoverageCell {
  source: ImportSource;
  status: CoverageCellStatus;
  /** Every batch ever recorded for this period+source, including REPLACED/MERGED - what makes a cell DUPLICATE. */
  batchCount: number;
  /** Transactions from the currently-active (non-REPLACED) batch(es) only. */
  activeTransactionCount: number;
}

export interface CoverageMonthRow {
  year: number;
  month: number;
  period: string;
  cells: CoverageCell[];
}

export interface CoverageYearGroup {
  year: number;
  months: CoverageMonthRow[];
}

export type CoverageImpact = "FIRST_FOR_PERIOD" | "ADDITIONAL";

export interface ImportHistoryEntry extends ImportBatchRecord {
  /** Was this the earliest batch ever recorded for its (source, reportingPeriod) - did it fill a coverage gap, or add onto/duplicate existing coverage? */
  coverageImpact: CoverageImpact;
}

export type DuplicateReason = "SAME_FILE_CHECKSUM" | "SAME_BATCH_REFERENCE_AND_PERIOD" | "REPLACEMENT_CHAIN";

export interface DuplicateGroup {
  id: string;
  source: ImportSource;
  reportingPeriod: string;
  reasons: DuplicateReason[];
  /** Most recent first. */
  batches: ImportBatchRecord[];
}

export interface PeriodAmountByCurrency {
  currency: string;
  totalAmount: number;
}

export interface PeriodPerformance {
  period: string;
  year: number;
  month: number;
  batchCount: number;
  transactionCount: number;
  /** Excludes batches with a null total_amount (mixed-currency files) - see TECH_DEBT.md. */
  amountsByCurrency: PeriodAmountByCurrency[];
  /** Null when either this period or the prior period has zero transactions - no meaningful percentage to show. */
  momGrowthPercent: number | null;
  /** Null when either this period or the same period one year earlier has zero transactions. */
  yoyGrowthPercent: number | null;
}

export interface SourceTotals {
  source: ImportSource;
  batchCount: number;
  transactionCount: number;
}

export interface HistoricalPerformanceResult {
  periods: PeriodPerformance[];
  sourceComparison: SourceTotals[];
}

export interface ImportDetail {
  batch: ImportBatchRecord;
  beneficiaries: ImportBeneficiaryRecord[];
}
