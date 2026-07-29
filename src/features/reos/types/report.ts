import type { SharedBatch, SharedBatchLifecycleStatus } from "./sharedBatch";
import type {
  BranchProcessingBatch,
  CreditToAccountTransaction,
} from "./transactionProcessing";

export type ReportCategory = "VOLUME" | "PERFORMANCE";

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
  | "WORKLOAD";

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

export interface SharedBatchReportRow {
  batch: SharedBatch;
}

export interface TransactionReportRow {
  transaction: CreditToAccountTransaction;
}

export interface BranchBatchReportRow {
  batch: BranchProcessingBatch;
}

export interface ReportSourceData {
  sharedBatches?: SharedBatch[];
  processingBatches?: BranchProcessingBatch[];
}

export interface VolumeReportRow extends Record<string, unknown> {
  id: string;
  batchReference: string;
  branchId: string | null;
  transactionReference?: string;
  beneficiaryName?: string;
  status?: SharedBatchLifecycleStatus | CreditToAccountTransaction["status"];
  transactionCount?: number;
  completedCount?: number;
  returnedCount?: number;
  proofCount?: number;
  date: string;
}
