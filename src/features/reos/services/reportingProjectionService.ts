import { getSharedBatchesVisibleToBranchOfficer } from "./branchAssignmentService";
import {
  getAllBranchProcessingQueueItems,
  getBranchProcessingQueueSummary,
  getBranchProcessingStatus,
  type BranchProcessingQueueItem,
} from "./branchProcessingQueueService";
import { buildProofDownloadBatchFromSharedBatch, getBatchDownloadSummary } from "./proofDownloadService";
import { getAllAssignments, getAllSharedBatches } from "./sharedBatchStore";
import type { Assignment } from "../types/assignment";
import type { BatchDownloadSummary } from "../types/proofDownload";
import type {
  BatchReportProjection,
  BranchReportProjection,
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
  const batches = applyBatchScope(getAllSharedBatches(), scope);
  const assignmentsByBatchId = indexAssignmentsByBatchId(getAllAssignments());

  const projections = batches.map((batch) =>
    createBatchProjection(batch, assignmentsByBatchId.get(batch.id) ?? null, projectedAt),
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
  const batches = applyBatchScope(getAllSharedBatches(), scope);
  const assignments = getAllAssignments();
  const branchNamesById = indexBranchNames(assignments);
  const queueItems = getAllBranchProcessingQueueItems().filter((item) => isQueueItemInScope(item, scope));

  const branchIds = new Set<string>();
  batches.forEach((batch) => {
    if (batch.assignedBranchId) {
      branchIds.add(batch.assignedBranchId);
    }
  });
  queueItems.forEach((item) => branchIds.add(item.branchId));

  const projections = Array.from(branchIds).map((branchId) => {
    const branchBatches = batches.filter((batch) => batch.assignedBranchId === branchId);
    // getBranchProcessingQueueSummary owns every queue count - called, never recomputed.
    const queueSummary = getBranchProcessingQueueSummary(branchId);

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

      branchProcessingStatus: getBranchProcessingStatus(branchId),

      proofImageCount: branchBatches.reduce(
        (total, batch) => total + (readBatchDownloadSummary(batch)?.proofImageCount ?? 0),
        0,
      ),

      projectedAt,
    } satisfies BranchReportProjection;
  });

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
  const assignments = getAllAssignments();
  const assignmentsById = indexAssignmentsById(assignments);
  const branchNamesById = indexBranchNames(assignments);
  const queueItems = getAllBranchProcessingQueueItems().filter((item) => isQueueItemInScope(item, scope));

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
  const assignmentsById = indexAssignmentsById(getAllAssignments());
  const queueItems = getAllBranchProcessingQueueItems().filter((item) => isQueueItemInScope(item, scope));

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

function createBatchProjection(
  batch: SharedBatch,
  assignment: Assignment | null,
  projectedAt: string,
): BatchReportProjection {
  // getBatchDownloadSummary owns the live proof rollup - called, never recomputed.
  const downloadSummary = readBatchDownloadSummary(batch);

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
function readBatchDownloadSummary(batch: SharedBatch): BatchDownloadSummary | null {
  const proofDownloadBatch = buildProofDownloadBatchFromSharedBatch(batch);

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
