import { getSharedBatchesVisibleToBranchOfficer } from "./branchAssignmentService";
import { getAllBranches } from "./branchRegistryService";
import {
  getAllBranchProcessingQueueItems,
  getBranchProcessingQueueSummary,
  getBranchProcessingStatus,
  getReservedAmountForAccount,
  type BranchProcessingQueueItem,
} from "./branchProcessingQueueService";
import { getAllFundingEvents, getAllPayoutAccounts } from "./liquidityService";
import { buildProofDownloadBatchFromSharedBatch, getBatchDownloadSummary } from "./proofDownloadService";
import { getAllAssignments, getAllSharedBatches } from "./sharedBatchStore";
import type { Assignment } from "../types/assignment";
import type { BranchHealth } from "../types/dashboard";
import type { FundingEvent, PayoutAccount } from "../types/liquidity";
import type { BatchDownloadSummary } from "../types/proofDownload";
import type {
  BatchReportProjection,
  BranchReportProjection,
  FundingEventProjection,
  LiquidityAccountProjection,
  LiquidityBranchProjection,
  ProcessingReportProjection,
  ProjectionScope,
  ProofReportProjection,
} from "../types/reportingProjection";
import type { SharedBatch } from "../types/sharedBatch";

/**
 * Reporting Projection Layer (Sprint 16 M4.2).
 *
 * Canonical design: REPORTING_PROJECTION_LAYER.md. This service is the only module
 * permitted to read operational state for reporting purposes. Reports, dashboards and
 * pages consume projections through reportService / dashboardService; none of them may
 * read a store directly, and no page or component may aggregate.
 *
 * What this layer does NOT do, by design:
 * - No writes. No mutation, no lifecycle transition, no status change.
 * - No hydration. hydrateBranchProcessingQueue is never called; reads use the
 *   enumerating accessors added in M4.1 (DEC-007).
 * - No business logic. Where a summary already exists it is called, never recomputed:
 *   getBranchProcessingQueueSummary, getBatchDownloadSummary and
 *   buildProofDownloadBatchFromSharedBatch supply their own values verbatim.
 * - No filtering. Report filters stay in reportService.matchesFilters. Actor scope is
 *   not a filter - see applyBatchScope / isQueueItemInScope.
 * - No formatting, no metrics, no totals, no persistence, no caching.
 * - No ownership. Every projected value belongs to another module.
 *
 * Operations are asynchronous from day one (REPORTING_PROJECTION_LAYER.md Section 9.1):
 * userService is already async, every candidate persistence option is async, and
 * retrofitting sync-to-async later would change every consumer signature.
 */

/** Grain: one Shared Batch. */
export async function projectBatches(scope: ProjectionScope): Promise<readonly BatchReportProjection[]> {
  const projectedAt = createProjectedAt();
  const batches = applyBatchScope(await getAllSharedBatches(), scope);
  const assignmentsByBatchId = indexAssignmentsByBatchId(await getAllAssignments());

  const projections = await Promise.all(
    batches.map((batch) => createBatchProjection(batch, assignmentsByBatchId.get(batch.id) ?? null, projectedAt)),
  );

  return freezeAll(
    sortBy(projections, (first, second) =>
      compareDescending(first.uploadDate, second.uploadDate) ||
      compareAscending(first.sharedBatchId, second.sharedBatchId),
    ),
  );
}

/** Grain: one branch. */
export async function projectBranches(scope: ProjectionScope): Promise<readonly BranchReportProjection[]> {
  const projectedAt = createProjectedAt();
  const batches = applyBatchScope(await getAllSharedBatches(), scope);
  const assignments = await getAllAssignments();
  const branchNamesById = indexBranchNames(assignments);
  const queueItems = (await getAllBranchProcessingQueueItems()).filter((item) => isQueueItemInScope(item, scope));

  const branchIds = new Set<string>();
  batches.forEach((batch) => {
    if (batch.assignedBranchId) {
      branchIds.add(batch.assignedBranchId);
    }
  });
  queueItems.forEach((item) => branchIds.add(item.branchId));

  const projections = await Promise.all(
    Array.from(branchIds).map(async (branchId) => {
      const branchBatches = batches.filter((batch) => batch.assignedBranchId === branchId);
      // getBranchProcessingQueueSummary owns every queue count - called, never recomputed.
      const queueSummary = await getBranchProcessingQueueSummary(branchId);

      const downloadSummaries = await Promise.all(branchBatches.map((batch) => readBatchDownloadSummary(batch)));
      const proofImageCount = downloadSummaries.reduce((total, summary) => total + (summary?.proofImageCount ?? 0), 0);

      return {
        branchId,
        branchName: branchNamesById.get(branchId) ?? branchId,

        batchCount: branchBatches.length,
        batchesAssigned: countLifecycle(branchBatches, "ASSIGNED"),
        batchesProcessing: countLifecycle(branchBatches, "PROCESSING"),
        batchesCompleted: countLifecycle(branchBatches, "COMPLETED"),
        batchesReadyForDownload: countLifecycle(branchBatches, "READY_FOR_DOWNLOAD"),
        batchesDownloaded: countLifecycle(branchBatches, "DOWNLOADED"),

        queueAssigned: queueSummary.assigned,
        queueInProgress: queueSummary.inProgress,
        queueOnHold: queueSummary.onHold,
        queueCompleted: queueSummary.completed,
        queueReturned: queueSummary.returned,
        queueRemaining: queueSummary.remaining,
        queueTotal: queueSummary.total,
        queueCompletionPercentage: queueSummary.completionPercentage,

        branchProcessingStatus: await getBranchProcessingStatus(branchId),

        proofImageCount,

        averageProcessingMinutes: computeAverageProcessingMinutes(
          queueItems.filter((item) => item.branchId === branchId),
        ),

        projectedAt,
      } satisfies BranchReportProjection;
    }),
  );

  return freezeAll(
    sortBy(projections, (first, second) =>
      compareAscending(first.branchName, second.branchName) ||
      compareAscending(first.branchId, second.branchId),
    ),
  );
}

/** Grain: one transaction (one BranchProcessingQueueItem). */
export async function projectProcessing(scope: ProjectionScope): Promise<readonly ProcessingReportProjection[]> {
  const projectedAt = createProjectedAt();
  const assignments = await getAllAssignments();
  const assignmentsById = indexAssignmentsById(assignments);
  const branchNamesById = indexBranchNames(assignments);
  const queueItems = (await getAllBranchProcessingQueueItems()).filter((item) => isQueueItemInScope(item, scope));

  const projections = queueItems.map((item) => {
    // A dangling assignment reference degrades batch context to null - never throws.
    const assignment = assignmentsById.get(item.assignmentId) ?? null;

    return {
      queueItemId: item.id,
      assignmentId: item.assignmentId,
      branchId: item.branchId,
      branchName: branchNamesById.get(item.branchId) ?? null,
      sharedBatchId: assignment?.sharedBatchId ?? null,
      batchReference: assignment?.batchReference ?? null,

      directRemitReference: item.beneficiary.directRemitReference,
      beneficiaryName: item.beneficiary.beneficiaryName,
      transactionDate: item.beneficiary.transactionDate,
      currency: item.beneficiary.currency,
      amount: item.beneficiary.amount,
      destinationCountry: item.beneficiary.destinationCountry,
      bankName: item.beneficiary.bankName,
      accountNumber: item.beneficiary.accountNumber,

      queueStatus: item.status,
      createdAt: item.createdAt,

      startedAt: item.startedAt,
      completedAt: item.completedAt,
      completedByUserId: item.completedByUserId,
      returnedAt: item.returnedAt,
      returnedByUserId: item.returnedByUserId,
      processingMinutes: computeProcessingMinutes(item.startedAt, item.completedAt),

      returnReasonId: item.returnReason?.id ?? null,
      returnReasonCode: item.returnReason?.code ?? null,
      returnReasonName: item.returnReason?.name ?? null,
      returnComment: item.returnComment,

      proofCount: item.proofs.length,
      hasProof: item.proofs.length > 0,

      manualReviewRequired: item.beneficiary.manualReviewRequired,
      manualReviewReason: item.beneficiary.manualReviewReason,

      projectedAt,
    } satisfies ProcessingReportProjection;
  });

  return freezeAll(
    sortBy(projections, (first, second) =>
      compareDescending(first.transactionDate, second.transactionDate) ||
      compareAscending(first.queueItemId, second.queueItemId),
    ),
  );
}

/** Grain: one proof-of-payment file. */
export async function projectProofs(scope: ProjectionScope): Promise<readonly ProofReportProjection[]> {
  const projectedAt = createProjectedAt();
  const projectedAtMs = new Date(projectedAt).getTime();
  const assignmentsById = indexAssignmentsById(await getAllAssignments());
  const queueItems = (await getAllBranchProcessingQueueItems()).filter((item) => isQueueItemInScope(item, scope));

  const projections = queueItems.flatMap((item) => {
    const assignment = assignmentsById.get(item.assignmentId) ?? null;

    return item.proofs.map((proof) => {
      const expiresAtMs = new Date(proof.expiresAt).getTime();

      return {
        proofId: proof.id,
        queueItemId: item.id,
        directRemitReference: item.beneficiary.directRemitReference,

        sharedBatchId: assignment?.sharedBatchId ?? null,
        batchReference: assignment?.batchReference ?? null,
        branchId: item.branchId,

        fileName: proof.fileName,
        fileType: proof.fileType,
        fileSize: proof.fileSize,

        uploadedByUserId: proof.uploadedByUserId,
        uploadedAt: proof.uploadedAt,

        expiresAt: proof.expiresAt,
        isExpired: Number.isNaN(expiresAtMs) ? false : expiresAtMs < projectedAtMs,
        status: proof.status,

        projectedAt,
      } satisfies ProofReportProjection;
    });
  });

  return freezeAll(
    sortBy(projections, (first, second) =>
      compareDescending(first.uploadedAt, second.uploadedAt) ||
      compareAscending(first.proofId, second.proofId),
    ),
  );
}

/**
 * Grain: one payout account (Liquidity Management, LIQUIDITY_MANAGEMENT.md).
 *
 * reservedBalance is read from branchProcessingQueueService.getReservedAmountForAccount -
 * the same function startBranchProcessingQueueItem calls for its own write-time
 * sufficiency check. Not recomputed here.
 */
export async function projectLiquidityAccounts(scope: ProjectionScope): Promise<readonly LiquidityAccountProjection[]> {
  const projectedAt = createProjectedAt();
  const branchNamesById = indexBranchNamesById();
  const accounts = (await getAllPayoutAccounts()).filter((account) => isBranchInScope(account.branchId, scope));

  const projections = await Promise.all(
    accounts.map((account) => buildLiquidityAccountProjection(account, branchNamesById, projectedAt)),
  );

  return freezeAll(
    sortBy(projections, (first, second) =>
      compareAscending(first.branchId, second.branchId) ||
      compareAscending(first.accountId, second.accountId),
    ),
  );
}

/** Grain: one branch's liquidity position. Sums only this branch's ACTIVE accounts. */
export async function projectLiquidityBranches(scope: ProjectionScope): Promise<readonly LiquidityBranchProjection[]> {
  const projectedAt = createProjectedAt();
  const branchNamesById = indexBranchNamesById();
  const allAccounts = await getAllPayoutAccounts();
  const allQueueItems = await getAllBranchProcessingQueueItems();
  const allFundingEvents = await getAllFundingEvents();

  const branchIds = new Set<string>();
  allAccounts.forEach((account) => branchIds.add(account.branchId));
  allQueueItems.forEach((item) => branchIds.add(item.branchId));

  const projections = await Promise.all(
    Array.from(branchIds)
      .filter((branchId) => isBranchInScope(branchId, scope))
      .map(async (branchId) => {
        const branchAccounts = allAccounts.filter((account) => account.branchId === branchId && account.status === "ACTIVE");
        const totalLiquidity = sumAmounts(branchAccounts, (account) => account.currentBalance);
        const reservedAmounts = await Promise.all(branchAccounts.map((account) => getReservedAmountForAccount(account.id)));
        const reservedLiquidity = reservedAmounts.reduce((total, amount) => total + amount, 0);
        const availableLiquidity = totalLiquidity - reservedLiquidity;

        const branchQueueItems = allQueueItems.filter((item) => item.branchId === branchId);
        const pendingProcessing = sumAmounts(
          branchQueueItems.filter((item) => item.status === "ASSIGNED"),
          (item) => item.beneficiary.amount,
        );
        const consumptionToday = sumAmounts(
          branchQueueItems.filter((item) => item.status === "COMPLETED" && item.completedAt && isSameCalendarDay(item.completedAt, projectedAt)),
          (item) => item.beneficiary.amount,
        );
        const fundingToday = sumAmounts(
          allFundingEvents.filter((event) => event.branchId === branchId && isSameCalendarDay(event.updatedAt, projectedAt)),
          (event) => event.totalAmount,
        );

        const minimumThreshold = sumAmounts(branchAccounts, (account) => account.minimumThreshold);

        return {
          branchId,
          branchName: branchNamesById.get(branchId) ?? branchId,

          accountCount: branchAccounts.length,
          totalLiquidity,
          reservedLiquidity,
          availableLiquidity,

          pendingProcessing,
          consumptionToday,
          fundingToday,

          health: computeLiquidityHealth(availableLiquidity, minimumThreshold),

          projectedAt,
        } satisfies LiquidityBranchProjection;
      }),
  );

  return freezeAll(
    sortBy(projections, (first, second) =>
      compareAscending(first.branchName, second.branchName) ||
      compareAscending(first.branchId, second.branchId),
    ),
  );
}

/** Grain: one funding event. */
export async function projectFundingEvents(scope: ProjectionScope): Promise<readonly FundingEventProjection[]> {
  const projectedAt = createProjectedAt();
  const branchNamesById = indexBranchNamesById();
  const events = (await getAllFundingEvents()).filter((event) => isBranchInScope(event.branchId, scope));

  const projections = events.map((event) => buildFundingEventProjection(event, branchNamesById, projectedAt));

  return freezeAll(
    sortBy(projections, (first, second) =>
      compareDescending(first.updatedAt, second.updatedAt) ||
      compareAscending(first.fundingEventId, second.fundingEventId),
    ),
  );
}

async function createBatchProjection(
  batch: SharedBatch,
  assignment: Assignment | null,
  projectedAt: string,
): Promise<BatchReportProjection> {
  // getBatchDownloadSummary owns the live proof rollup - called, never recomputed.
  const downloadSummary = await readBatchDownloadSummary(batch);

  return {
    sharedBatchId: batch.id,
    batchReference: batch.reference,
    fileName: batch.fileName,

    uploadDate: batch.uploadDate,
    uploadedByUserId: batch.uploadedByUserId,

    assignmentStatus: batch.assignmentStatus,
    assignedBranchId: batch.assignedBranchId,
    assignedBranchName: assignment?.assignedBranchName ?? null,
    assignedByUserId: batch.assignedByUserId,
    assignedAt: batch.assignedAt,
    isLocked: batch.isLocked,

    lifecycleStatus: batch.lifecycleStatus,

    totalBeneficiaries: batch.totalBeneficiaries,
    assignedBeneficiaries: batch.assignedBeneficiaries,
    completedBeneficiaries: batch.completedBeneficiaries,
    returnedBeneficiaries: batch.returnedBeneficiaries,
    duplicateReferenceCount: batch.duplicateReferenceCount,
    manualReviewCount: batch.manualReviewCount,

    assignmentReadyCount: assignment?.readyTransactionCount ?? null,
    assignmentManualReviewCount: assignment?.manualReviewCount ?? null,
    assignmentInvalidCount: assignment?.invalidCount ?? null,

    lastReassignedByUserId: batch.lastReassignedByUserId,
    lastReassignedAt: batch.lastReassignedAt,
    lastReassignmentReason: batch.lastReassignmentReason,

    proofImageCount: downloadSummary?.proofImageCount ?? null,
    completedTransactionCount: downloadSummary?.completedTransactionCount ?? null,
    returnedTransactionCount: downloadSummary?.returnedTransactionCount ?? null,

    projectedAt,
  };
}

/**
 * Reads the proof rollup for a batch through Proof Management's own functions.
 * Returns null for a batch with no assigned branch, which buildProofDownloadBatchFromSharedBatch
 * cannot build a view for - an absence, not an error.
 */
async function readBatchDownloadSummary(batch: SharedBatch): Promise<BatchDownloadSummary | null> {
  const proofDownloadBatch = await buildProofDownloadBatchFromSharedBatch(batch);

  return proofDownloadBatch ? getBatchDownloadSummary(proofDownloadBatch) : null;
}

/**
 * Actor scope for Shared Batches. Operations Manager visibility is enterprise-wide and
 * Direct Remit Officer visibility spans branches (BUSINESS_RULES.md); only the Branch
 * Officer is restricted, and that restriction reuses branchAssignmentService's existing
 * visibility rule rather than writing a second one.
 *
 * A Branch Officer with no branch sees nothing - the safe direction for a scope rule.
 */
function applyBatchScope(batches: readonly SharedBatch[], scope: ProjectionScope): SharedBatch[] {
  if (scope.actorRole !== "BRANCH_OFFICER") {
    return [...batches];
  }

  if (!scope.branchId) {
    return [];
  }

  return getSharedBatchesVisibleToBranchOfficer([...batches], scope.branchId);
}

/** Actor scope for queue items and their proofs. Same rule as applyBatchScope. */
function isQueueItemInScope(item: BranchProcessingQueueItem, scope: ProjectionScope): boolean {
  if (scope.actorRole !== "BRANCH_OFFICER") {
    return true;
  }

  return Boolean(scope.branchId) && item.branchId === scope.branchId;
}

/** Actor scope for Liquidity Management grains. Same rule as applyBatchScope. */
function isBranchInScope(branchId: string, scope: ProjectionScope): boolean {
  if (scope.actorRole !== "BRANCH_OFFICER") {
    return true;
  }

  return scope.branchId === branchId;
}

function indexAssignmentsById(assignments: readonly Assignment[]): Map<string, Assignment> {
  return new Map(assignments.map((assignment) => [assignment.id, assignment] as const));
}

function indexAssignmentsByBatchId(assignments: readonly Assignment[]): Map<string, Assignment> {
  return new Map(assignments.map((assignment) => [assignment.sharedBatchId, assignment] as const));
}

function indexBranchNames(assignments: readonly Assignment[]): Map<string, string> {
  const branchNamesById = new Map<string, string>();

  assignments.forEach((assignment) => {
    if (assignment.assignedBranchId && assignment.assignedBranchName) {
      branchNamesById.set(assignment.assignedBranchId, assignment.assignedBranchName);
    }
  });

  return branchNamesById;
}

function countLifecycle(batches: readonly SharedBatch[], status: SharedBatch["lifecycleStatus"]): number {
  return batches.filter((batch) => batch.lifecycleStatus === status).length;
}

/**
 * Branch names for Liquidity Management, from the branch registry (Section 3/14) rather
 * than indexBranchNames's assignment-derived index - a branch may own payout accounts
 * before it has ever received an Assignment.
 */
function indexBranchNamesById(): Map<string, string> {
  return new Map(getAllBranches().map((branch) => [branch.id, branch.name] as const));
}

async function buildLiquidityAccountProjection(
  account: PayoutAccount,
  branchNamesById: Map<string, string>,
  projectedAt: string,
): Promise<LiquidityAccountProjection> {
  const reservedBalance = await getReservedAmountForAccount(account.id);
  const availableBalance = account.currentBalance - reservedBalance;

  return {
    accountId: account.id,
    branchId: account.branchId,
    branchName: branchNamesById.get(account.branchId) ?? null,

    bank: account.bank,
    accountNumber: account.accountNumber,
    currency: account.currency,

    currentBalance: account.currentBalance,
    reservedBalance,
    availableBalance,
    minimumThreshold: account.minimumThreshold,

    status: account.status,
    health: computeLiquidityHealth(availableBalance, account.minimumThreshold),

    lastUpdatedAt: account.lastUpdatedAt,
    lastUpdatedByUserId: account.lastUpdatedByUserId,

    projectedAt,
  };
}

function buildFundingEventProjection(
  event: FundingEvent,
  branchNamesById: Map<string, string>,
  projectedAt: string,
): FundingEventProjection {
  return {
    fundingEventId: event.id,
    branchId: event.branchId,
    branchName: branchNamesById.get(event.branchId) ?? null,

    accountCount: event.entries.length,
    totalAmount: event.totalAmount,
    reference: event.reference,
    notes: event.notes,

    updatedByUserId: event.updatedByUserId,
    updatedAt: event.updatedAt,

    projectedAt,
  };
}

function sumAmounts<T>(items: T[], getAmount: (item: T) => number): number {
  return items.reduce((total, item) => total + getAmount(item), 0);
}

/**
 * Same-calendar-day comparison for Liquidity Management's "today" figures
 * (consumptionToday, fundingToday) - the same rule dashboardService.isSameOperationalDay
 * already applies to Transactions Today, expressed here since that helper is private to
 * dashboardService.
 */
function isSameCalendarDay(value: string, referenceIso: string): boolean {
  const date = new Date(value);
  const reference = new Date(referenceIso);

  return date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth()
    && date.getDate() === reference.getDate();
}

/**
 * GREEN/YELLOW/RED (types/dashboard.ts's existing vocabulary, not a second one -
 * LIQUIDITY_MANAGEMENT.md Section 8). Below zero available is RED; below the configured
 * minimum threshold is YELLOW; otherwise GREEN. A zero threshold never yields YELLOW,
 * since "no threshold configured" cannot mean "always below it".
 */
function computeLiquidityHealth(availableBalance: number, minimumThreshold: number): BranchHealth {
  if (availableBalance <= 0) {
    return "RED";
  }

  if (minimumThreshold > 0 && availableBalance < minimumThreshold) {
    return "YELLOW";
  }

  return "GREEN";
}

/**
 * Duration for one transaction (Decision D-6, unblocked). Null unless both timestamps
 * are present - a transaction still in progress, or one that never recorded a start
 * (data predating this milestone), has no duration to report, not a zero one.
 */
function computeProcessingMinutes(startedAt: string | null, completedAt: string | null): number | null {
  if (!startedAt || !completedAt) {
    return null;
  }

  const startedAtMs = new Date(startedAt).getTime();
  const completedAtMs = new Date(completedAt).getTime();

  if (Number.isNaN(startedAtMs) || Number.isNaN(completedAtMs)) {
    return null;
  }

  return Math.max(0, Math.round((completedAtMs - startedAtMs) / 60000));
}

/**
 * Branch-level average, over only the completed transactions that have a computable
 * duration. Null - not zero - when the branch has none, so a "0 minutes" branch is
 * never confused with a "no data" branch.
 */
function computeAverageProcessingMinutes(queueItems: readonly BranchProcessingQueueItem[]): number | null {
  const durations = queueItems
    .map((item) => computeProcessingMinutes(item.startedAt, item.completedAt))
    .filter((minutes): minutes is number => minutes !== null);

  if (durations.length === 0) {
    return null;
  }

  return Math.round(durations.reduce((total, minutes) => total + minutes, 0) / durations.length);
}

/**
 * Every operation sorts explicitly with a stable tiebreaker before returning
 * (REPORTING_PROJECTION_LAYER.md Section 9.5). In-memory iteration is insertion-ordered
 * but a datastore guarantees no order, so relying on incidental ordering would silently
 * reorder every report the day persistence lands.
 */
function sortBy<T>(rows: T[], comparator: (first: T, second: T) => number): T[] {
  return [...rows].sort(comparator);
}

function compareAscending(first: string, second: string): number {
  return first.localeCompare(second);
}

function compareDescending(first: string, second: string): number {
  return second.localeCompare(first);
}

/**
 * Projections are immutable at runtime as well as in the type system. They are flat by
 * design, so a shallow freeze is a deep freeze.
 */
function freezeAll<T>(rows: T[]): readonly T[] {
  rows.forEach((row) => Object.freeze(row));
  return Object.freeze(rows);
}

function createProjectedAt(): string {
  return new Date().toISOString();
}
