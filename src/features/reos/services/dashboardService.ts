import type {
  BranchHealth,
  BranchPerformanceRow,
  CriticalAlert,
  DashboardExceptionCategory,
  DashboardQueueCategory,
  DashboardStat,
  ExceptionCenterItem,
  OperationsDashboard,
  OperationsDashboardRole,
  TodaySummaryMetric,
  WorkQueueItem,
} from "../types/dashboard";
import type {
  BatchReportProjection,
  BranchReportProjection,
  ProcessingReportProjection,
  ProofReportProjection,
} from "../types/reportingProjection";

/**
 * Operations Dashboard assembly (data source replaced in Sprint 16 M4.5).
 *
 * This service builds the dashboard view model only. It no longer reads operational
 * entities: its input is now the reporting projections, supplied by reportService, which
 * obtains them from the Reporting Projection Layer. That makes the projection layer the
 * single reader of operational state for both Reporting and Dashboards, as designed in
 * REPORTING_ARCHITECTURE.md Section 10.1.
 *
 * The output type (OperationsDashboard and every row type it contains) is unchanged, so
 * every dashboard component renders exactly as before - no widget, card, chart or style
 * was altered. Only where the numbers come from changed.
 *
 * One category of value is deliberately not produced here:
 * - Financial metrics (USD value, revenue). REPORTING_STANDARDS.md places them out of
 *   scope, and the projection layer carries no aggregate amounts by design. The fields
 *   remain in the view model at 0 because removing them is Decision D-9 and would require
 *   changing components, which is out of this milestone's scope.
 *
 * Duration metrics (processing speed, Decision D-6) are no longer blocked: Branch
 * Processing now records startedAt/completedAt, and reportingProjectionService computes
 * processingMinutes per transaction and averageProcessingMinutes per branch. This service
 * only averages what the projection layer already computed - see getAverageProcessingMinutes.
 * Still null - not zero - wherever nothing has completed yet.
 */

const delayedPayoutMinutes = 120;

export interface OperationsDashboardProjections {
  batches: readonly BatchReportProjection[];
  branches: readonly BranchReportProjection[];
  processing: readonly ProcessingReportProjection[];
  proofs: readonly ProofReportProjection[];
  now?: Date;
}

export function buildOperationsDashboard(
  projections: OperationsDashboardProjections,
  role: OperationsDashboardRole = "OPERATIONS_MANAGER",
): OperationsDashboard {
  const now = projections.now ?? new Date();
  const batches = projections.batches ?? [];
  const branches = projections.branches ?? [];
  const processing = projections.processing ?? [];
  const proofs = projections.proofs ?? [];

  const todaysTransactions = processing.filter((transaction) =>
    isSameOperationalDay(transaction.transactionDate, now),
  );
  const completedToday = todaysTransactions.filter((transaction) => transaction.queueStatus === "COMPLETED");
  const returnedTransactions = processing.filter((transaction) => transaction.queueStatus === "RETURNED");
  const missingProofTransactions = processing.filter(
    (transaction) => transaction.queueStatus === "COMPLETED" && transaction.proofCount === 0,
  );
  const duplicateReferences = processing.filter((transaction) => transaction.manualReviewRequired);
  const validationFailures = processing.filter((transaction) => Boolean(transaction.manualReviewReason));
  const assignmentProblems = batches.filter(
    (batch) => batch.assignmentStatus === "UNASSIGNED" || !batch.assignedBranchId,
  );

  const averageProcessingTime = getAverageProcessingMinutes(processing);
  const readyForDownload = countLifecycle(batches, "READY_FOR_DOWNLOAD");
  const downloadedBatches = countLifecycle(batches, "DOWNLOADED");
  const branchPerformance = buildBranchPerformance(branches, processing);
  const workQueue = buildWorkQueue(batches, now);
  const exceptions = buildExceptions({
    returnedTransactions: returnedTransactions.length,
    missingProofs: missingProofTransactions.length,
    duplicateReferences: duplicateReferences.length,
    validationFailures: validationFailures.length,
    assignmentProblems: assignmentProblems.length,
  });

  return {
    generatedAt: now.toISOString(),
    role,
    stats: buildStats({
      transactionsToday: todaysTransactions.length,
      averageProcessingTime,
      completedBatches: countLifecycle(batches, "COMPLETED"),
      readyForDownload,
      downloadedBatches,
      returnedTransactions: returnedTransactions.length,
    }),
    criticalAlerts: buildCriticalAlerts({
      branchPerformance,
      delayedPayouts: getDelayedPayoutCount(processing, now),
      missingProofs: missingProofTransactions.length,
      processingBacklog: workQueue.filter(
        (item) => item.category === "OLDEST_ASSIGNED_BATCH" || item.category === "OLDEST_PROCESSING_BATCH",
      ).length,
    }),
    branchPerformance,
    workQueue,
    exceptions,
    todaySummary: buildTodaySummary({
      transactionsProcessed: completedToday.length,
      averageProcessingTime,
      branchPerformance,
      returnRate: getRate(returnedTransactions.length, processing.length),
      proofCount: proofs.length,
    }),
  };
}

function buildStats(input: {
  transactionsToday: number;
  averageProcessingTime: number | null;
  completedBatches: number;
  readyForDownload: number;
  downloadedBatches: number;
  returnedTransactions: number;
}): DashboardStat[] {
  return [
    createStat("transactions-today", "Transactions Today", input.transactionsToday.toString(), "Current operational volume"),
    createStat("usd-value-today", "USD Value Today", formatCurrency(0), "Value requiring cash and liquidity oversight"),
    createStat("revenue-today", "Revenue Today", formatCurrency(0), "Revenue from today's processed value"),
    createStat(
      "average-processing-time",
      "Average Processing Time",
      formatMinutes(input.averageProcessingTime),
      "Speed indicator for branch execution",
    ),
    createStat("completed-batches", "Completed Batches", input.completedBatches.toString(), "Batches that finished branch processing"),
    createStat("ready-for-download", "Ready for Download", input.readyForDownload.toString(), "Proof packages awaiting Direct Remit action"),
    createStat("downloaded-batches", "Downloaded Batches", input.downloadedBatches.toString(), "Batches that completed the REOS workflow"),
    createStat("returned-transactions", "Returned Transactions", input.returnedTransactions.toString(), "Transactions requiring operational review"),
  ];
}

function buildCriticalAlerts(input: {
  branchPerformance: BranchPerformanceRow[];
  delayedPayouts: number;
  missingProofs: number;
  processingBacklog: number;
}): CriticalAlert[] {
  const branchesNotProcessing = input.branchPerformance.filter(
    (branch) => branch.currentWorkload > 0 && branch.processingSpeedMinutes === null,
  ).length;
  const liquidityIssues = input.branchPerformance.filter(
    (branch) => branch.health === "RED" && branch.currentWorkload > 0,
  ).length;

  return [
    createAlert(
      "branches-not-processing",
      "Branches Not Processing",
      branchesNotProcessing,
      "Confirm branch activity or reassign operational attention.",
      "Review branches",
      "/reos/dashboard#branch-performance",
    ),
    createAlert(
      "liquidity-issues",
      "Liquidity Issues",
      liquidityIssues,
      "Review branches with high workload and value concentration.",
      "Review branch liquidity",
      "/reos/dashboard#branch-performance",
    ),
    createAlert(
      "delayed-payouts",
      "Delayed Payouts",
      input.delayedPayouts,
      "Escalate batches that have exceeded the processing threshold.",
      "Review work queue",
      "/reos/dashboard#work-queue",
    ),
    createAlert(
      "missing-proofs",
      "Missing Proofs",
      input.missingProofs,
      "Resolve completed transactions that lack proof images.",
      "Review exceptions",
      "/reos/dashboard#exception-center",
    ),
    createAlert(
      "processing-backlog",
      "Processing Backlog",
      input.processingBacklog,
      "Prioritize oldest assigned and processing batches.",
      "Review backlog",
      "/reos/dashboard#work-queue",
    ),
  ];
}

/**
 * Branch rows come straight from BranchReportProjection, whose queue counts are supplied
 * verbatim by branchProcessingQueueService.getBranchProcessingQueueSummary through the
 * projection layer - they are never recomputed here. Only the manual-review error count
 * is derived, because no existing summary provides it per branch.
 */
function buildBranchPerformance(
  branches: readonly BranchReportProjection[],
  processing: readonly ProcessingReportProjection[],
): BranchPerformanceRow[] {
  return branches
    .map((branch) => {
      const errors = processing.filter(
        (transaction) => transaction.branchId === branch.branchId && transaction.manualReviewRequired,
      ).length;
      const workload = branch.queueRemaining;
      const returns = branch.queueReturned;
      const speed = branch.averageProcessingMinutes;

      return {
        branchId: branch.branchId,
        branchName: branch.branchName,
        transactions: branch.queueTotal,
        usdValue: 0,
        revenue: 0,
        processingSpeedMinutes: speed,
        errors,
        returns,
        currentWorkload: workload,
        health: getBranchHealth(workload, returns, errors, speed),
      };
    })
    .sort((left, right) => right.currentWorkload - left.currentWorkload || left.branchName.localeCompare(right.branchName));
}

/**
 * The DOWNLOAD_PENDING category previously came from a separate proofDownloadBatches
 * input list, which in practice held the same batches as the Shared Batch list. With one
 * batch projection there is no second source, and emitting a batch under both
 * READY_FOR_DOWNLOAD and DOWNLOAD_PENDING would double-count it in the work queue. The
 * category remains defined and rendered; it simply has no separate source to draw from.
 */
function buildWorkQueue(batches: readonly BatchReportProjection[], now: Date): WorkQueueItem[] {
  const queue: WorkQueueItem[] = [
    ...batches
      .filter((batch) => batch.lifecycleStatus === "ASSIGNED")
      .map((batch) =>
        createQueueItem("OLDEST_ASSIGNED_BATCH", batch.sharedBatchId, batch.batchReference, batch.assignedBranchId, batch.assignedAt ?? batch.uploadDate, now),
      ),
    ...batches
      .filter((batch) => batch.lifecycleStatus === "PROCESSING")
      .map((batch) =>
        createQueueItem("OLDEST_PROCESSING_BATCH", batch.sharedBatchId, batch.batchReference, batch.assignedBranchId, batch.assignedAt ?? batch.uploadDate, now),
      ),
    ...batches
      .filter((batch) => batch.lifecycleStatus === "READY_FOR_DOWNLOAD")
      .map((batch) =>
        createQueueItem("READY_FOR_DOWNLOAD", batch.sharedBatchId, batch.batchReference, batch.assignedBranchId, batch.uploadDate, now),
      ),
    ...batches
      .filter((batch) => (batch.returnedTransactionCount ?? 0) > 0)
      .map((batch) =>
        createQueueItem("RETURNED_BATCHES", batch.sharedBatchId, batch.batchReference, batch.assignedBranchId, batch.uploadDate, now),
      ),
  ];

  return queue.sort((left, right) => right.urgency - left.urgency || right.ageMinutes - left.ageMinutes);
}

function buildExceptions(input: {
  returnedTransactions: number;
  missingProofs: number;
  duplicateReferences: number;
  validationFailures: number;
  assignmentProblems: number;
}): ExceptionCenterItem[] {
  return [
    createException("RETURNED_TRANSACTIONS", "Returned Transactions", input.returnedTransactions, "Review return reasons and decide next action."),
    createException("MISSING_PROOFS", "Missing Proofs", input.missingProofs, "Resolve proof gaps before download handoff."),
    createException("DUPLICATE_REFERENCES", "Duplicate References", input.duplicateReferences, "Review duplicate references before processing continues."),
    createException("VALIDATION_FAILURES", "Validation Failures", input.validationFailures, "Resolve records that failed import validation."),
    createException("BATCH_ASSIGNMENT_PROBLEMS", "Batch Assignment Problems", input.assignmentProblems, "Assign or correct batches with no branch owner."),
  ];
}

function buildTodaySummary(input: {
  transactionsProcessed: number;
  averageProcessingTime: number | null;
  branchPerformance: BranchPerformanceRow[];
  returnRate: number;
  proofCount: number;
}): TodaySummaryMetric[] {
  const topBranch = input.branchPerformance[0]?.branchName ?? "No branch activity";

  return [
    { label: "Transactions Processed", value: input.transactionsProcessed.toString(), detail: "Completed today" },
    { label: "USD Processed", value: formatCurrency(0), detail: "Completed value today" },
    { label: "Revenue", value: formatCurrency(0), detail: "Revenue from processed value" },
    { label: "Average Processing Time", value: formatMinutes(input.averageProcessingTime), detail: "Completed transactions today" },
    { label: "Branch Ranking", value: topBranch, detail: "Highest current workload" },
    { label: "Return Rate", value: `${input.returnRate.toFixed(1)}%`, detail: "Returned transactions over total tracked" },
  ];
}

function createStat(id: string, label: string, value: string, detail: string): DashboardStat {
  return { id, label, value, detail };
}

function createAlert(
  id: string,
  title: string,
  count: number,
  decision: string,
  drillDownLabel: string,
  drillDownPath: string,
): CriticalAlert {
  return {
    id,
    title,
    severity: count > 5 ? "CRITICAL" : count > 0 ? "WARNING" : "INFO",
    count,
    decision,
    drillDownLabel,
    drillDownPath,
  };
}

function createException(
  category: DashboardExceptionCategory,
  label: string,
  count: number,
  decision: string,
): ExceptionCenterItem {
  return {
    id: category.toLowerCase(),
    category,
    label,
    count,
    decision,
    drillDownPath: "/reos/dashboard#exception-center",
  };
}

function createQueueItem(
  category: DashboardQueueCategory,
  id: string,
  batchReference: string,
  branchId: string | null,
  dateValue: string | null,
  now: Date,
): WorkQueueItem {
  const ageMinutes = dateValue ? getAgeMinutes(dateValue, now) : 0;

  return {
    id: `${category}-${id}`,
    category,
    label: formatQueueCategory(category),
    batchReference,
    branchId,
    ageMinutes,
    urgency: getQueueUrgency(category, ageMinutes),
    action: getQueueAction(category),
  };
}

function getBranchHealth(workload: number, returns: number, errors: number, speed: number | null): BranchHealth {
  if (errors > 0 || returns > 5 || workload > 25 || (speed !== null && speed > delayedPayoutMinutes)) {
    return "RED";
  }

  if (returns > 0 || workload > 10 || speed === null) {
    return "YELLOW";
  }

  return "GREEN";
}

function getQueueUrgency(category: DashboardQueueCategory, ageMinutes: number): number {
  const categoryWeight: Record<DashboardQueueCategory, number> = {
    OLDEST_ASSIGNED_BATCH: 80,
    OLDEST_PROCESSING_BATCH: 90,
    READY_FOR_DOWNLOAD: 70,
    DOWNLOAD_PENDING: 75,
    RETURNED_BATCHES: 85,
  };

  return categoryWeight[category] + ageMinutes;
}

function getQueueAction(category: DashboardQueueCategory): string {
  const actions: Record<DashboardQueueCategory, string> = {
    OLDEST_ASSIGNED_BATCH: "Confirm branch start",
    OLDEST_PROCESSING_BATCH: "Escalate processing delay",
    READY_FOR_DOWNLOAD: "Prepare proof handoff",
    DOWNLOAD_PENDING: "Prompt Direct Remit download",
    RETURNED_BATCHES: "Review returns",
  };

  return actions[category];
}

function formatQueueCategory(category: DashboardQueueCategory): string {
  const labels: Record<DashboardQueueCategory, string> = {
    OLDEST_ASSIGNED_BATCH: "Oldest Assigned Batch",
    OLDEST_PROCESSING_BATCH: "Oldest Processing Batch",
    READY_FOR_DOWNLOAD: "Ready For Download",
    DOWNLOAD_PENDING: "Download Pending",
    RETURNED_BATCHES: "Returned Batches",
  };

  return labels[category];
}

function countLifecycle(
  batches: readonly BatchReportProjection[],
  status: BatchReportProjection["lifecycleStatus"],
): number {
  return batches.filter((batch) => batch.lifecycleStatus === status).length;
}

/**
 * "Delayed" is measured from when the transaction entered this branch's processing
 * queue (createdAt), not from transactionDate - the underlying remittance's real-world
 * date, which is set at the original transaction and is almost always already hours or
 * days old by the time REOS ever sees it. Using transactionDate here counted nearly
 * every non-terminal queue item as delayed regardless of actual REOS queue age.
 */
function getDelayedPayoutCount(processing: readonly ProcessingReportProjection[], now: Date): number {
  return processing.filter(
    (transaction) =>
      transaction.queueStatus !== "COMPLETED" &&
      transaction.queueStatus !== "RETURNED" &&
      getAgeMinutes(transaction.createdAt, now) > delayedPayoutMinutes,
  ).length;
}

/**
 * Enterprise-wide average processing time (Decision D-6, unblocked). processingMinutes
 * is already computed per transaction by reportingProjectionService, called here rather
 * than recomputed - this function only averages what the projection layer supplies.
 * Null - not zero - when nothing is complete yet, same "No data" the dashboard already
 * renders for a null value.
 */
function getAverageProcessingMinutes(processing: readonly ProcessingReportProjection[]): number | null {
  const durations = processing
    .map((transaction) => transaction.processingMinutes)
    .filter((minutes): minutes is number => minutes !== null);

  if (durations.length === 0) {
    return null;
  }

  return Math.round(durations.reduce((total, minutes) => total + minutes, 0) / durations.length);
}

function getAgeMinutes(value: string, now: Date): number {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - timestamp) / 60000));
}

function getRate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

function isSameOperationalDay(value: string, now: Date): boolean {
  const date = new Date(value);

  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMinutes(value: number | null): string {
  return value === null ? "No data" : `${Math.round(value)} min`;
}
