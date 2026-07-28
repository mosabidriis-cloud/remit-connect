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
  OperationsDashboardSourceData,
  TodaySummaryMetric,
  WorkQueueItem,
} from "../types/dashboard";
import type { ProofDownloadBatch } from "../types/proofDownload";
import type { SharedBatch } from "../types/sharedBatch";
import type { BranchProcessingBatch, CreditToAccountTransaction } from "../types/transactionProcessing";

const defaultRevenueRate = 0;
const delayedPayoutMinutes = 120;

export function buildOperationsDashboard(
  sourceData: OperationsDashboardSourceData,
  role: OperationsDashboardRole = "OPERATIONS_MANAGER",
): OperationsDashboard {
  const now = sourceData.now ?? new Date();
  const revenueRate = sourceData.revenueRate ?? defaultRevenueRate;
  const sharedBatches = sourceData.sharedBatches ?? [];
  const processingBatches = sourceData.processingBatches ?? [];
  const proofDownloadBatches = sourceData.proofDownloadBatches ?? [];
  const transactions = processingBatches.flatMap((batch) => batch.transactions);
  const todaysTransactions = transactions.filter((transaction) => isSameOperationalDay(transaction.beneficiary.transactionDate, now));
  const completedToday = todaysTransactions.filter((transaction) => transaction.status === "COMPLETED");
  const returnedTransactions = transactions.filter((transaction) => transaction.status === "RETURNED");
  const missingProofTransactions = transactions.filter(
    (transaction) => transaction.status === "COMPLETED" && transaction.proofs.length === 0,
  );
  const duplicateReferences = transactions.filter((transaction) => transaction.beneficiary.manualReviewRequired);
  const validationFailures = transactions.filter((transaction) => Boolean(transaction.beneficiary.manualReviewReason));
  const assignmentProblems = sharedBatches.filter(
    (batch) => batch.assignmentStatus === "UNASSIGNED" || !batch.assignedBranchId,
  );
  const usdValueToday = sumUsdValue(todaysTransactions);
  const revenueToday = usdValueToday * revenueRate;
  const averageProcessingTime = getAverageProcessingMinutes(completedToday);
  const readyForDownload = countLifecycle(sharedBatches, "READY_FOR_DOWNLOAD") + countProofLifecycle(proofDownloadBatches, "READY_FOR_DOWNLOAD");
  const downloadedBatches = countLifecycle(sharedBatches, "DOWNLOADED") + countProofLifecycle(proofDownloadBatches, "DOWNLOADED");
  const branchPerformance = buildBranchPerformance(sourceData, transactions, revenueRate);
  const workQueue = buildWorkQueue(sharedBatches, proofDownloadBatches, now);
  const exceptions = buildExceptions({
    returnedTransactions,
    missingProofTransactions,
    duplicateReferences,
    validationFailures,
    assignmentProblems,
  });

  return {
    generatedAt: now.toISOString(),
    role,
    stats: buildStats({
      transactionsToday: todaysTransactions.length,
      usdValueToday,
      revenueToday,
      averageProcessingTime,
      completedBatches: countLifecycle(sharedBatches, "COMPLETED"),
      readyForDownload,
      downloadedBatches,
      returnedTransactions: returnedTransactions.length,
    }),
    criticalAlerts: buildCriticalAlerts({
      branchPerformance,
      delayedPayouts: getDelayedPayoutCount(processingBatches, now),
      missingProofs: missingProofTransactions.length,
      readyForDownload,
      processingBacklog: workQueue.filter((item) => item.category === "OLDEST_ASSIGNED_BATCH" || item.category === "OLDEST_PROCESSING_BATCH").length,
    }),
    branchPerformance,
    workQueue,
    exceptions,
    todaySummary: buildTodaySummary({
      transactionsProcessed: completedToday.length,
      usdProcessed: sumUsdValue(completedToday),
      revenue: sumUsdValue(completedToday) * revenueRate,
      averageProcessingTime,
      branchPerformance,
      returnRate: getRate(returnedTransactions.length, transactions.length),
    }),
  };
}

function buildStats(input: {
  transactionsToday: number;
  usdValueToday: number;
  revenueToday: number;
  averageProcessingTime: number | null;
  completedBatches: number;
  readyForDownload: number;
  downloadedBatches: number;
  returnedTransactions: number;
}): DashboardStat[] {
  return [
    createStat("transactions-today", "Transactions Today", input.transactionsToday.toString(), "Current operational volume"),
    createStat("usd-value-today", "USD Value Today", formatCurrency(input.usdValueToday), "Value requiring cash and liquidity oversight"),
    createStat("revenue-today", "Revenue Today", formatCurrency(input.revenueToday), "Revenue from today's processed value"),
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
  readyForDownload: number;
  processingBacklog: number;
}): CriticalAlert[] {
  const branchesNotProcessing = input.branchPerformance.filter((branch) => branch.currentWorkload > 0 && branch.processingSpeedMinutes === null).length;
  const liquidityIssues = input.branchPerformance.filter((branch) => branch.health === "RED" && branch.currentWorkload > 0).length;

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

function buildBranchPerformance(
  sourceData: OperationsDashboardSourceData,
  transactions: CreditToAccountTransaction[],
  revenueRate: number,
): BranchPerformanceRow[] {
  const branchIds = new Set<string>();

  for (const branch of sourceData.branches ?? []) {
    branchIds.add(branch.id);
  }

  for (const batch of sourceData.processingBatches ?? []) {
    branchIds.add(batch.assignedBranchId);
  }

  for (const transaction of transactions) {
    if (transaction.beneficiary.assignedBranchId) {
      branchIds.add(transaction.beneficiary.assignedBranchId);
    }
  }

  return Array.from(branchIds).map((branchId) => {
    const branch = sourceData.branches?.find((item) => item.id === branchId);
    const branchTransactions = transactions.filter(
      (transaction) => transaction.beneficiary.assignedBranchId === branchId,
    );
    const workload = branchTransactions.filter((transaction) => transaction.status === "PENDING").length;
    const returns = branchTransactions.filter((transaction) => transaction.status === "RETURNED").length;
    const errors = branchTransactions.filter((transaction) => transaction.beneficiary.manualReviewRequired).length;
    const usdValue = sumUsdValue(branchTransactions);
    const speed = getAverageProcessingMinutes(branchTransactions.filter((transaction) => transaction.status === "COMPLETED"));

    return {
      branchId,
      branchName: branch?.name ?? branchId,
      transactions: branchTransactions.length,
      usdValue,
      revenue: usdValue * revenueRate,
      processingSpeedMinutes: speed,
      errors,
      returns,
      currentWorkload: workload,
      health: getBranchHealth(workload, returns, errors, speed),
    };
  }).sort((left, right) => right.currentWorkload - left.currentWorkload || left.branchName.localeCompare(right.branchName));
}

function buildWorkQueue(sharedBatches: SharedBatch[], proofDownloadBatches: ProofDownloadBatch[], now: Date): WorkQueueItem[] {
  const queue: WorkQueueItem[] = [
    ...sharedBatches
      .filter((batch) => batch.lifecycleStatus === "ASSIGNED")
      .map((batch) => createQueueItem("OLDEST_ASSIGNED_BATCH", batch.id, batch.reference, batch.assignedBranchId, batch.assignedAt ?? batch.uploadDate, now)),
    ...sharedBatches
      .filter((batch) => batch.lifecycleStatus === "PROCESSING")
      .map((batch) => createQueueItem("OLDEST_PROCESSING_BATCH", batch.id, batch.reference, batch.assignedBranchId, batch.assignedAt ?? batch.uploadDate, now)),
    ...sharedBatches
      .filter((batch) => batch.lifecycleStatus === "READY_FOR_DOWNLOAD")
      .map((batch) => createQueueItem("READY_FOR_DOWNLOAD", batch.id, batch.reference, batch.assignedBranchId, batch.uploadDate, now)),
    ...proofDownloadBatches
      .filter((batch) => batch.lifecycleStatus === "READY_FOR_DOWNLOAD")
      .map((batch) => createQueueItem("DOWNLOAD_PENDING", batch.id, batch.sharedBatchReference, batch.assignedBranchId, batch.completedAt, now)),
    ...sharedBatches
      .filter((batch) => batch.returnedBeneficiaries > 0)
      .map((batch) => createQueueItem("RETURNED_BATCHES", batch.id, batch.reference, batch.assignedBranchId, batch.uploadDate, now)),
  ];

  return queue.sort((left, right) => right.urgency - left.urgency || right.ageMinutes - left.ageMinutes);
}

function buildExceptions(input: {
  returnedTransactions: CreditToAccountTransaction[];
  missingProofTransactions: CreditToAccountTransaction[];
  duplicateReferences: CreditToAccountTransaction[];
  validationFailures: CreditToAccountTransaction[];
  assignmentProblems: SharedBatch[];
}): ExceptionCenterItem[] {
  return [
    createException("RETURNED_TRANSACTIONS", "Returned Transactions", input.returnedTransactions.length, "Review return reasons and decide next action."),
    createException("MISSING_PROOFS", "Missing Proofs", input.missingProofTransactions.length, "Resolve proof gaps before download handoff."),
    createException("DUPLICATE_REFERENCES", "Duplicate References", input.duplicateReferences.length, "Review duplicate references before processing continues."),
    createException("VALIDATION_FAILURES", "Validation Failures", input.validationFailures.length, "Resolve records that failed import validation."),
    createException("BATCH_ASSIGNMENT_PROBLEMS", "Batch Assignment Problems", input.assignmentProblems.length, "Assign or correct batches with no branch owner."),
  ];
}

function buildTodaySummary(input: {
  transactionsProcessed: number;
  usdProcessed: number;
  revenue: number;
  averageProcessingTime: number | null;
  branchPerformance: BranchPerformanceRow[];
  returnRate: number;
}): TodaySummaryMetric[] {
  const topBranch = input.branchPerformance[0]?.branchName ?? "No branch activity";

  return [
    { label: "Transactions Processed", value: input.transactionsProcessed.toString(), detail: "Completed today" },
    { label: "USD Processed", value: formatCurrency(input.usdProcessed), detail: "Completed value today" },
    { label: "Revenue", value: formatCurrency(input.revenue), detail: "Revenue from processed value" },
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

function countLifecycle(sharedBatches: SharedBatch[], status: SharedBatch["lifecycleStatus"]): number {
  return sharedBatches.filter((batch) => batch.lifecycleStatus === status).length;
}

function countProofLifecycle(proofDownloadBatches: ProofDownloadBatch[], status: ProofDownloadBatch["lifecycleStatus"]): number {
  return proofDownloadBatches.filter((batch) => batch.lifecycleStatus === status).length;
}

function getDelayedPayoutCount(processingBatches: BranchProcessingBatch[], now: Date): number {
  return processingBatches.filter((batch) =>
    batch.transactions.some((transaction) =>
      transaction.status === "PENDING" && getAgeMinutes(transaction.beneficiary.transactionDate, now) > delayedPayoutMinutes,
    ),
  ).length;
}

function getAverageProcessingMinutes(transactions: CreditToAccountTransaction[]): number | null {
  const durations = transactions
    .map((transaction) => {
      if (!transaction.completedAt) {
        return null;
      }

      return getAgeMinutes(transaction.beneficiary.transactionDate, new Date(transaction.completedAt));
    })
    .filter((duration): duration is number => duration !== null && duration >= 0);

  if (durations.length === 0) {
    return null;
  }

  return durations.reduce((total, duration) => total + duration, 0) / durations.length;
}

function getAgeMinutes(value: string, now: Date): number {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - timestamp) / 60000));
}

function sumUsdValue(transactions: CreditToAccountTransaction[]): number {
  return transactions.reduce((total, transaction) => {
    if (transaction.beneficiary.currency !== "USD") {
      return total;
    }

    return total + transaction.beneficiary.amount;
  }, 0);
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
  if (value === null) {
    return "No data";
  }

  return `${Math.round(value)} min`;
}
