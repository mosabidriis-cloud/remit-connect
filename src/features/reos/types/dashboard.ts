import type { Branch } from "./branch";
import type { ProofDownloadBatch } from "./proofDownload";
import type { SharedBatch } from "./sharedBatch";
import type { BranchProcessingBatch } from "./transactionProcessing";

export type OperationsDashboardRole =
  | "OPERATIONS_MANAGER"
  | "GENERAL_MANAGER";

export type DashboardAlertSeverity =
  | "CRITICAL"
  | "WARNING"
  | "INFO";

export type BranchHealth = "GREEN" | "YELLOW" | "RED";

export type DashboardQueueCategory =
  | "OLDEST_ASSIGNED_BATCH"
  | "OLDEST_PROCESSING_BATCH"
  | "READY_FOR_DOWNLOAD"
  | "DOWNLOAD_PENDING"
  | "RETURNED_BATCHES";

export type DashboardExceptionCategory =
  | "RETURNED_TRANSACTIONS"
  | "MISSING_PROOFS"
  | "DUPLICATE_REFERENCES"
  | "VALIDATION_FAILURES"
  | "BATCH_ASSIGNMENT_PROBLEMS";

export interface OperationsDashboardSourceData {
  branches?: Branch[];
  sharedBatches?: SharedBatch[];
  processingBatches?: BranchProcessingBatch[];
  proofDownloadBatches?: ProofDownloadBatch[];
  revenueRate?: number;
  now?: Date;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface CriticalAlert {
  id: string;
  title: string;
  severity: DashboardAlertSeverity;
  count: number;
  decision: string;
  drillDownLabel: string;
  drillDownPath: string;
}

export interface BranchPerformanceRow {
  branchId: string;
  branchName: string;
  transactions: number;
  usdValue: number;
  revenue: number;
  processingSpeedMinutes: number | null;
  errors: number;
  returns: number;
  currentWorkload: number;
  health: BranchHealth;
}

export interface WorkQueueItem {
  id: string;
  category: DashboardQueueCategory;
  label: string;
  batchReference: string;
  branchId: string | null;
  ageMinutes: number;
  urgency: number;
  action: string;
}

export interface ExceptionCenterItem {
  id: string;
  category: DashboardExceptionCategory;
  label: string;
  count: number;
  decision: string;
  drillDownPath: string;
}

export interface TodaySummaryMetric {
  label: string;
  value: string;
  detail: string;
}

export interface OperationsDashboard {
  generatedAt: string;
  role: OperationsDashboardRole;
  stats: DashboardStat[];
  criticalAlerts: CriticalAlert[];
  branchPerformance: BranchPerformanceRow[];
  workQueue: WorkQueueItem[];
  exceptions: ExceptionCenterItem[];
  todaySummary: TodaySummaryMetric[];
}
