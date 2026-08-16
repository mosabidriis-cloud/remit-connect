/**
 * LIQUIDITY is additive (Liquidity Management, LIQUIDITY_MANAGEMENT.md Section 11) - a
 * genuinely new operational category, not a rename of VOLUME/PERFORMANCE, and does not
 * touch the still-open Decision D-1 (Operations/Performance/Audit taxonomy).
 */
export type ReportCategory = "VOLUME" | "PERFORMANCE" | "LIQUIDITY";

export type ReportType =
  | "SHARED_BATCHES"
  | "TRANSACTIONS"
  | "COMPLETED_TRANSACTIONS"
  | "RETURNED_TRANSACTIONS"
  | "READY_FOR_DOWNLOAD_BATCHES"
  | "DOWNLOADED_BATCHES"
  | "BRANCH_PERFORMANCE"
  | "OFFICER_PERFORMANCE"
  | "PROCESSING_TIME"
  | "RETURN_RATE"
  | "PROOF_COMPLETION"
  | "WORKLOAD"
  | "BRANCH_LIQUIDITY"
  | "DAILY_CONSUMPTION"
  | "ACCOUNT_BALANCES"
  | "LOW_BALANCE_ACCOUNTS"
  | "LIQUIDITY_EXCEPTIONS"
  | "FUNDING_HISTORY";

export type ReportFormat = "TABLE";

export interface ReportFilter {
  fromDate: string | null;
  toDate: string | null;
  branchId: string | null;
  batchReference: string | null;
  reportType: ReportType;
}

export interface ReportColumn {
  key: string;
  title: string;
  sortable: boolean;
}

export interface ReportMetric {
  label: string;
  value: number | string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  category: ReportCategory;
  type: ReportType;
  format: ReportFormat;
  description: string;
  columns: ReportColumn[];
}

export interface ReportResult<T> {
  definition: ReportDefinition;
  filters: ReportFilter;
  metrics: ReportMetric[];
  rows: T[];
  totals: ReportMetric[];
  generatedAt: string;
}

/**
 * The row shape a report consumer sees. Every reporting projection model is flat and
 * Record<string, unknown>-compatible, so one row type serves every report and ReportTable
 * can sort and render generically without knowing which projection backs it.
 *
 * Sprint 16 M4.4 removed the previous row and source-data types (VolumeReportRow,
 * SharedBatchReportRow, TransactionReportRow, BranchBatchReportRow, ReportSourceData).
 * They existed only to describe data handed to ReportsPage through React Router
 * location.state; reports now read live operational data through the projection layer,
 * so nothing constructs or consumes those shapes any more.
 */
export type ReportRow = Record<string, unknown>;
