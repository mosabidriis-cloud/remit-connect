import { buildOperationsDashboard } from "./dashboardService";
import {
  projectBatches,
  projectBranches,
  projectProcessing,
  projectProofs,
} from "./reportingProjectionService";
import type { OperationsDashboard, OperationsDashboardRole } from "../types/dashboard";
import type {
  ReportDefinition,
  ReportFilter,
  ReportMetric,
  ReportResult,
  ReportRow,
  ReportType,
} from "../types/report";
import type {
  BatchReportProjection,
  BranchReportProjection,
  ProcessingReportProjection,
  ProjectionScope,
  ProofReportProjection,
} from "../types/reportingProjection";
import type { SharedBatchLifecycleStatus } from "../types/sharedBatch";
import type { CreditToAccountTransactionStatus } from "../types/transactionProcessing";

/**
 * Report Service (Sprint 16 M4.3, wired to the UI in M4.4).
 *
 * Canonical design: REPORTING_ARCHITECTURE.md. This is the single consumer of the
 * Reporting Projection Layer and the only place report filtering lives. Pages consume
 * this service and nothing else; no page, component or dashboard may aggregate
 * operational data or read an operational store.
 *
 * Division of responsibility, per REPORTING_PROJECTION_LAYER.md Section 3:
 * - The projection layer owns all reading and all cross-module aggregation. It is the
 *   only module that touches sharedBatchStore, branchProcessingQueueService,
 *   proofDownloadService, assignmentService or branchAssignmentService - this file
 *   imports none of them, by rule.
 * - This service owns filtering, sorting, metrics and ReportResult assembly. It never
 *   mutates, never hydrates, never performs a lifecycle transition, and never recomputes
 *   a per-record summary that BranchProcessingQueueSummary or BatchDownloadSummary
 *   already owns - it only aggregates across already-projected rows, which no existing
 *   summary provides.
 *
 * All generate operations are asynchronous because the projection layer is
 * (REPORTING_PROJECTION_LAYER.md Section 9.1).
 */

/**
 * Column keys match the projection field names the rows actually carry, so ReportTable
 * renders them generically. Titles are unchanged from the pre-M4.4 definitions, so the
 * UI reads exactly as before.
 *
 * Two titles did change, for truthfulness rather than design: the completed and returned
 * transaction reports previously labelled their date column "Completed At" / "Returned At",
 * but no completion or return timestamp is recorded anywhere in the live workflow
 * (Decision D-6), and the legacy code silently fell back to the transaction date. The
 * columns now say what they actually show.
 */
const volumeReportDefinitions: ReportDefinition[] = [
  {
    id: "volume-shared-batches",
    name: "Shared Batches",
    category: "VOLUME",
    type: "SHARED_BATCHES",
    format: "TABLE",
    description: "How many Shared Batches are in REOS operations?",
    columns: [
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "assignedBranchId", title: "Branch", sortable: true },
      { key: "lifecycleStatus", title: "Lifecycle Status", sortable: true },
      { key: "totalBeneficiaries", title: "Transactions", sortable: true },
      { key: "completedTransactionCount", title: "Completed", sortable: true },
      { key: "returnedTransactionCount", title: "Returned", sortable: true },
      { key: "uploadDate", title: "Upload Date", sortable: true },
    ],
  },
  {
    id: "volume-transactions",
    name: "Transactions",
    category: "VOLUME",
    type: "TRANSACTIONS",
    format: "TABLE",
    description: "How many Credit-to-Account transactions are in branch operations?",
    columns: [
      { key: "directRemitReference", title: "Direct Remit Reference", sortable: true },
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "beneficiaryName", title: "Beneficiary", sortable: true },
      { key: "queueStatus", title: "Transaction Status", sortable: true },
      { key: "proofCount", title: "Proofs", sortable: true },
      { key: "transactionDate", title: "Transaction Date", sortable: true },
    ],
  },
  {
    id: "volume-completed-transactions",
    name: "Completed Transactions",
    category: "VOLUME",
    type: "COMPLETED_TRANSACTIONS",
    format: "TABLE",
    description: "How many transactions have been completed by branch operations?",
    columns: [
      { key: "directRemitReference", title: "Direct Remit Reference", sortable: true },
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "beneficiaryName", title: "Beneficiary", sortable: true },
      { key: "proofCount", title: "Proofs", sortable: true },
      { key: "transactionDate", title: "Transaction Date", sortable: true },
    ],
  },
  {
    id: "volume-returned-transactions",
    name: "Returned Transactions",
    category: "VOLUME",
    type: "RETURNED_TRANSACTIONS",
    format: "TABLE",
    description: "How many transactions have been returned by branch operations?",
    columns: [
      { key: "directRemitReference", title: "Direct Remit Reference", sortable: true },
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "beneficiaryName", title: "Beneficiary", sortable: true },
      { key: "returnReasonName", title: "Return Reason", sortable: true },
      { key: "transactionDate", title: "Transaction Date", sortable: true },
    ],
  },
  {
    id: "volume-ready-for-download-batches",
    name: "Ready For Download Batches",
    category: "VOLUME",
    type: "READY_FOR_DOWNLOAD_BATCHES",
    format: "TABLE",
    description: "How many Shared Batches are ready for Direct Remit proof download?",
    columns: [
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "assignedBranchId", title: "Branch", sortable: true },
      { key: "lifecycleStatus", title: "Lifecycle Status", sortable: true },
      { key: "totalBeneficiaries", title: "Transactions", sortable: true },
      { key: "completedTransactionCount", title: "Completed", sortable: true },
      { key: "returnedTransactionCount", title: "Returned", sortable: true },
      { key: "uploadDate", title: "Upload Date", sortable: true },
    ],
  },
  {
    id: "volume-downloaded-batches",
    name: "Downloaded Batches",
    category: "VOLUME",
    type: "DOWNLOADED_BATCHES",
    format: "TABLE",
    description: "How many Shared Batches have completed the REOS download workflow?",
    columns: [
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "assignedBranchId", title: "Branch", sortable: true },
      { key: "lifecycleStatus", title: "Lifecycle Status", sortable: true },
      { key: "totalBeneficiaries", title: "Transactions", sortable: true },
      { key: "completedTransactionCount", title: "Completed", sortable: true },
      { key: "returnedTransactionCount", title: "Returned", sortable: true },
      { key: "uploadDate", title: "Upload Date", sortable: true },
    ],
  },
];

/**
 * Performance Report definitions, added in M4.3. TECH_DEBT.md recorded that the
 * PERFORMANCE category was typed but had no definitions; these are the first two, and
 * both sit inside the existing approved VOLUME|PERFORMANCE taxonomy, so they do not
 * touch Decision D-1 (the proposed Operations/Performance/Audit rename).
 */
const performanceReportDefinitions: ReportDefinition[] = [
  {
    id: "performance-branch-performance",
    name: "Branch Performance",
    category: "PERFORMANCE",
    type: "BRANCH_PERFORMANCE",
    format: "TABLE",
    description: "How is each branch progressing through the work assigned to it?",
    columns: [
      { key: "branchName", title: "Branch", sortable: true },
      { key: "batchCount", title: "Batches", sortable: true },
      { key: "queueTotal", title: "Transactions", sortable: true },
      { key: "queueCompleted", title: "Completed", sortable: true },
      { key: "queueReturned", title: "Returned", sortable: true },
      { key: "queueOnHold", title: "On Hold", sortable: true },
      { key: "queueRemaining", title: "Remaining", sortable: true },
      { key: "queueCompletionPercentage", title: "Completion %", sortable: true },
      { key: "branchProcessingStatus", title: "Processing Status", sortable: true },
    ],
  },
  {
    id: "performance-proof-completion",
    name: "Proof Completion",
    category: "PERFORMANCE",
    type: "PROOF_COMPLETION",
    format: "TABLE",
    description: "What proof-of-payment evidence exists for processed transactions?",
    columns: [
      { key: "directRemitReference", title: "Direct Remit Reference", sortable: true },
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "fileName", title: "Proof File", sortable: true },
      { key: "uploadedAt", title: "Uploaded At", sortable: true },
      { key: "status", title: "Proof Status", sortable: true },
      { key: "isExpired", title: "Expired", sortable: true },
    ],
  },
];

export class ReportService {
  private readonly reports: ReportDefinition[] = [
    ...volumeReportDefinitions,
    ...performanceReportDefinitions,
  ];

  register(definition: ReportDefinition): void {
    const exists = this.reports.some((r) => r.id === definition.id);

    if (exists) {
      throw new Error(`Report '${definition.id}' is already registered.`);
    }

    this.reports.push(definition);
  }

  getDefinitions(): ReportDefinition[] {
    return [...this.reports];
  }

  getDefinition(id: string): ReportDefinition | undefined {
    return this.reports.find((r) => r.id === id);
  }

  validateFilters(filters: ReportFilter): boolean {
    if (!filters.reportType) {
      return false;
    }

    if (
      filters.fromDate &&
      filters.toDate &&
      filters.fromDate > filters.toDate
    ) {
      return false;
    }

    return true;
  }

  /**
   * Single entry point for report generation. Routes a report type to the operation that
   * serves it, so callers never need to know which projection backs which report - and
   * so no caller can be tempted to narrow rows itself.
   */
  async generateReport(
    scope: ProjectionScope,
    filters: ReportFilter,
  ): Promise<Readonly<ReportResult<ReportRow>>> {
    if (isBatchReport(filters.reportType)) {
      return this.generateBatchReport(scope, filters);
    }

    if (filters.reportType === "BRANCH_PERFORMANCE") {
      return this.generateBranchReport(scope, filters);
    }

    if (filters.reportType === "PROOF_COMPLETION") {
      return this.generateProofReport(scope, filters);
    }

    return this.generateProcessingReport(scope, filters);
  }

  /**
   * Business question: how many Shared Batches are in REOS operations, and where are they
   * in the lifecycle?
   *
   * Also serves the lifecycle-restricted variants (Ready For Download, Downloaded), which
   * are the same report narrowed to one lifecycle status - reusing the existing
   * getBatchReportLifecycleStatus mapping rather than a second implementation.
   */
  async generateBatchReport(
    scope: ProjectionScope,
    filters: ReportFilter,
  ): Promise<Readonly<ReportResult<BatchReportProjection>>> {
    const definition = this.resolveDefinition(filters.reportType, "SHARED_BATCHES");
    this.assertValidFilters(filters);

    const lifecycleStatus = getBatchReportLifecycleStatus(filters.reportType);
    const rows = [...(await projectBatches(scope))]
      .filter((row) => !lifecycleStatus || row.lifecycleStatus === lifecycleStatus)
      .filter((row) =>
        matchesFilters(
          { date: row.uploadDate, branchId: row.assignedBranchId, batchReference: row.batchReference },
          filters,
        ),
      )
      .sort(
        (first, second) =>
          compareDescending(first.uploadDate, second.uploadDate) ||
          compareAscending(first.sharedBatchId, second.sharedBatchId),
      );

    return createReportResult(definition, filters, rows, [
      { label: definition.name, value: rows.length },
      { label: "Total Transactions", value: sumBy(rows, (row) => row.totalBeneficiaries) },
      { label: "Completed", value: sumBy(rows, (row) => row.completedTransactionCount ?? 0) },
      { label: "Returned", value: sumBy(rows, (row) => row.returnedTransactionCount ?? 0) },
    ]);
  }

  /**
   * Business question: how is each branch progressing through the work assigned to it?
   *
   * Only the Branch filter applies. A branch is an aggregate, not a dated record, so it
   * carries no date and no single batch reference - REPORTING_STANDARDS.md requires a
   * report to use only its relevant filters, so the other two are passed as null and
   * skipped rather than silently emptying the report.
   */
  async generateBranchReport(
    scope: ProjectionScope,
    filters: ReportFilter,
  ): Promise<Readonly<ReportResult<BranchReportProjection>>> {
    const definition = this.resolveDefinition(filters.reportType, "BRANCH_PERFORMANCE");
    this.assertValidFilters(filters);

    const rows = [...(await projectBranches(scope))]
      .filter((row) => matchesFilters({ date: null, branchId: row.branchId, batchReference: null }, filters))
      .sort(
        (first, second) =>
          compareAscending(first.branchName, second.branchName) ||
          compareAscending(first.branchId, second.branchId),
      );

    return createReportResult(definition, filters, rows, [
      { label: "Branches", value: rows.length },
      { label: "Total Transactions", value: sumBy(rows, (row) => row.queueTotal) },
      { label: "Completed", value: sumBy(rows, (row) => row.queueCompleted) },
      { label: "Returned", value: sumBy(rows, (row) => row.queueReturned) },
      { label: "Remaining", value: sumBy(rows, (row) => row.queueRemaining) },
    ]);
  }

  /**
   * Business question: how many Credit-to-Account transactions are in branch operations,
   * and what state is each in?
   *
   * Also serves the status-restricted variants (Completed, Returned), reusing the
   * existing getTransactionReportStatus mapping. Counts the five-value queue status, so
   * On Hold stays distinguishable from In Progress.
   */
  async generateProcessingReport(
    scope: ProjectionScope,
    filters: ReportFilter,
  ): Promise<Readonly<ReportResult<ProcessingReportProjection>>> {
    const definition = this.resolveDefinition(filters.reportType, "TRANSACTIONS");
    this.assertValidFilters(filters);

    const queueStatus = getTransactionReportStatus(filters.reportType);
    const rows = [...(await projectProcessing(scope))]
      .filter((row) => !queueStatus || row.queueStatus === queueStatus)
      .filter((row) =>
        matchesFilters(
          { date: row.transactionDate, branchId: row.branchId, batchReference: row.batchReference },
          filters,
        ),
      )
      .sort(
        (first, second) =>
          compareDescending(first.transactionDate, second.transactionDate) ||
          compareAscending(first.queueItemId, second.queueItemId),
      );

    return createReportResult(definition, filters, rows, [
      { label: definition.name, value: rows.length },
      { label: "Completed", value: countBy(rows, (row) => row.queueStatus === "COMPLETED") },
      { label: "Returned", value: countBy(rows, (row) => row.queueStatus === "RETURNED") },
      { label: "On Hold", value: countBy(rows, (row) => row.queueStatus === "ON_HOLD") },
      { label: "Proofs", value: sumBy(rows, (row) => row.proofCount) },
    ]);
  }

  /** Business question: what proof-of-payment evidence exists for processed transactions? */
  async generateProofReport(
    scope: ProjectionScope,
    filters: ReportFilter,
  ): Promise<Readonly<ReportResult<ProofReportProjection>>> {
    const definition = this.resolveDefinition(filters.reportType, "PROOF_COMPLETION");
    this.assertValidFilters(filters);

    const rows = [...(await projectProofs(scope))]
      .filter((row) =>
        matchesFilters(
          { date: row.uploadedAt, branchId: row.branchId, batchReference: row.batchReference },
          filters,
        ),
      )
      .sort(
        (first, second) =>
          compareDescending(first.uploadedAt, second.uploadedAt) ||
          compareAscending(first.proofId, second.proofId),
      );

    return createReportResult(definition, filters, rows, [
      { label: "Total Proofs", value: rows.length },
      { label: "Transactions With Proof", value: new Set(rows.map((row) => row.queueItemId)).size },
      { label: "Downloaded", value: countBy(rows, (row) => row.status === "DOWNLOADED") },
      { label: "Expired", value: countBy(rows, (row) => row.isExpired) },
    ]);
  }

  /**
   * Builds the Operations Dashboard from the same projections the reports use
   * (Sprint 16 M4.5).
   *
   * Exposed here so OperationsDashboardPage has exactly one service dependency and cannot
   * reach an operational store, matching the rule already applied to ReportsPage. This
   * service still owns no dashboard logic: it gathers the four projections through its own
   * generate operations and hands them to dashboardService, which owns the view model.
   * Nothing is recomputed in either direction, and no report becomes a dashboard.
   *
   * Filters are not applied - a dashboard answers "what needs attention right now?" across
   * everything in scope for the actor, so it uses unfiltered projections. Actor scope is
   * still enforced, by the projection layer.
   */
  async generateOperationsDashboard(
    scope: ProjectionScope,
    role: OperationsDashboardRole = "OPERATIONS_MANAGER",
  ): Promise<OperationsDashboard> {
    const filters = createUnfilteredDashboardFilters();

    const [batches, branches, processing, proofs] = await Promise.all([
      this.generateBatchReport(scope, { ...filters, reportType: "SHARED_BATCHES" }),
      this.generateBranchReport(scope, { ...filters, reportType: "BRANCH_PERFORMANCE" }),
      this.generateProcessingReport(scope, { ...filters, reportType: "TRANSACTIONS" }),
      this.generateProofReport(scope, { ...filters, reportType: "PROOF_COMPLETION" }),
    ]);

    return buildOperationsDashboard(
      {
        batches: batches.rows,
        branches: branches.rows,
        processing: processing.rows,
        proofs: proofs.rows,
      },
      role,
    );
  }

  private assertValidFilters(filters: ReportFilter): void {
    if (!this.validateFilters(filters)) {
      throw new Error("The selected date range is invalid.");
    }
  }

  private resolveDefinition(reportType: ReportType, fallback: ReportType): ReportDefinition {
    const definition =
      this.reports.find((report) => report.type === reportType) ??
      this.reports.find((report) => report.type === fallback);

    if (!definition) {
      throw new Error(`No report definition is registered for '${reportType}'.`);
    }

    return definition;
  }
}

export const reportService = new ReportService();

function isBatchReport(reportType: ReportType): boolean {
  return (
    reportType === "SHARED_BATCHES" ||
    reportType === "READY_FOR_DOWNLOAD_BATCHES" ||
    reportType === "DOWNLOADED_BATCHES"
  );
}

function getBatchReportLifecycleStatus(reportType: ReportType): SharedBatchLifecycleStatus | null {
  if (reportType === "READY_FOR_DOWNLOAD_BATCHES") {
    return "READY_FOR_DOWNLOAD";
  }

  if (reportType === "DOWNLOADED_BATCHES") {
    return "DOWNLOADED";
  }

  return null;
}

function getTransactionReportStatus(reportType: ReportType): CreditToAccountTransactionStatus | null {
  if (reportType === "COMPLETED_TRANSACTIONS") {
    return "COMPLETED";
  }

  if (reportType === "RETURNED_TRANSACTIONS") {
    return "RETURNED";
  }

  return null;
}

/**
 * The filterable fields of a report row.
 *
 * `date` and `batchReference` are nullable to mean "not applicable to this report" - an
 * aggregate row such as a branch has neither, and a criterion that cannot apply is
 * skipped rather than failing the row, which would silently empty the report.
 * `branchId` is different: null there means genuinely unassigned, so an explicit Branch
 * filter correctly excludes it.
 */
type ReportFilterableFields = {
  date: string | null;
  branchId: string | null;
  batchReference: string | null;
};

/**
 * The single filter implementation for all REOS reports. Filtering lives here and nowhere
 * else: not in the projection layer, not in a page, not in a component.
 */
function matchesFilters(row: ReportFilterableFields, filters: ReportFilter): boolean {
  const rowDate = row.date?.slice(0, 10) ?? null;

  if (rowDate && filters.fromDate && rowDate < filters.fromDate) {
    return false;
  }

  if (rowDate && filters.toDate && rowDate > filters.toDate) {
    return false;
  }

  if (filters.branchId?.trim() && row.branchId !== filters.branchId.trim()) {
    return false;
  }

  if (
    row.batchReference &&
    filters.batchReference?.trim() &&
    !row.batchReference.toLowerCase().includes(filters.batchReference.trim().toLowerCase())
  ) {
    return false;
  }

  return true;
}

/**
 * Assembles an immutable ReportResult. Metrics double as totals, matching the convention
 * the previous implementation used. Rows arrive already frozen from the projection layer;
 * the result object and its arrays are frozen here, so nothing a consumer receives is
 * mutable.
 */
function createReportResult<T>(
  definition: ReportDefinition,
  filters: ReportFilter,
  rows: T[],
  metrics: ReportMetric[],
): Readonly<ReportResult<T>> {
  const frozenMetrics = freezeArray(metrics.map((metric) => Object.freeze(metric) as ReportMetric));

  return Object.freeze({
    definition,
    filters: Object.freeze({ ...filters }),
    metrics: frozenMetrics,
    rows: freezeArray(rows),
    totals: frozenMetrics,
    generatedAt: new Date().toISOString(),
  });
}

/**
 * Freezes at runtime while keeping the declared array type, so a frozen result still
 * satisfies the ReportResult contract its consumers use.
 */
function freezeArray<T>(items: T[]): T[] {
  return Object.freeze(items) as T[];
}

function sumBy<T>(rows: T[], getValue: (row: T) => number): number {
  return rows.reduce((total, row) => total + getValue(row), 0);
}

function countBy<T>(rows: T[], predicate: (row: T) => boolean): number {
  return rows.filter(predicate).length;
}

function compareAscending(first: string, second: string): number {
  return first.localeCompare(second);
}

function compareDescending(first: string, second: string): number {
  return second.localeCompare(first);
}

/** A dashboard reads across everything in the actor's scope, so no filter is applied. */
function createUnfilteredDashboardFilters(): ReportFilter {
  return {
    fromDate: null,
    toDate: null,
    branchId: null,
    batchReference: null,
    reportType: "SHARED_BATCHES",
  };
}
