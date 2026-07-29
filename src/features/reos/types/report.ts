import type { SharedBatch, SharedBatchLifecycleStatus } from "./sharedBatch";
import type {
  BranchProcessingBatch,
  CreditToAccountTransaction,
} from "./transactionProcessing";

export type ReportCategory = "VOLUME" | "PERFORMANCE";

export type ReportType =
  | "SHARED_BATCHES"
  | "TRANSACTIONS"
  | "BRANCH_PERFORMANCE"
  | "OFFICER_PERFORMANCE"
  | "PROCESSING_TIME"
  | "RETURN_RATE"
  | "PROOF_COMPLETION"
  | "WORKLOAD";

export type ReportFormat = "TABLE";

export interface ReportFilter {
  fromDate: string | null;
  toDate: string | null;
  branchId: string | null;
  reportType: ReportType;
  lifecycleStatus: SharedBatchLifecycleStatus | null;
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
  generatedAt: string;
}

export interface SharedBatchReportRow {
  batch: SharedBatch;
}

export interface TransactionReportRow {
  transaction: CreditToAccountTransaction;
}

export interface BranchBatchReportRow {
  batch: BranchProcessingBatch;
}