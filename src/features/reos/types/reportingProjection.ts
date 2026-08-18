import type {
  BranchProcessingQueueStatus,
  BranchProcessingStatus,
} from "../services/branchProcessingQueueService";
import type { BranchHealth } from "./dashboard";
import type { PayoutAccountStatus } from "./liquidity";
import type { ProofOfPaymentFileStatus } from "./proofOfPayment";
import type { SharedBatchAssignmentStatus, SharedBatchLifecycleStatus } from "./sharedBatch";
import type { ReosUserRole } from "./user";

/**
 * Reporting projection models (Sprint 16 M4.2).
 *
 * Canonical design: REPORTING_PROJECTION_LAYER.md. These are read-only views of
 * operational state, produced exclusively by reportingProjectionService.
 *
 * Reporting owns only these shapes and the projectedAt stamp - every value inside
 * them is owned by another module and reproduced read-only (REPORTING_PROJECTION_LAYER.md
 * Section 5). Design rules applied to all four models:
 *
 * 1. Flat - primitives only. No nested operational entity is ever embedded, so no
 *    consumer can reach a writable-looking object through a projection.
 * 2. Record<string, unknown>-compatible, so ReportTable can sort and render generically.
 * 3. readonly fields, frozen at runtime by the service.
 * 4. Nulls mean "not recorded" - never zero, never false.
 * 5. One declared grain per model.
 *
 * Fields blocked by open decisions still omitted (D-5 audit trail, D-7 branch registry)
 * rather than declared as permanently-null - see REPORTING_PROJECTION_LAYER.md Section
 * 4.6. D-6 (processing timestamps and actor attribution) is unblocked: BranchReportProjection
 * and ProcessingReportProjection now carry the fields Section 4.6 pre-designed for it.
 */

/**
 * Describes who is asking. Scope is not a report filter: a filter narrows what a user
 * chose to see and may be cleared, scope narrows what a user is permitted to see and
 * may not. Enforced in the projection service before any row is returned
 * (REPORTING_PROJECTION_LAYER.md Section 6.3).
 */
export interface ProjectionScope {
  readonly actorUserId: string;
  readonly actorRole: ReosUserRole;
  /** The actor's branch. Required for BRANCH_OFFICER; ignored for other roles. */
  readonly branchId: string | null;
}

/** Grain: one Shared Batch. */
export interface BatchReportProjection extends Record<string, unknown> {
  readonly sharedBatchId: string;
  readonly batchReference: string;
  readonly fileName: string;

  readonly uploadDate: string;
  readonly uploadedByUserId: string;

  readonly assignmentStatus: SharedBatchAssignmentStatus;
  readonly assignedBranchId: string | null;
  readonly assignedBranchName: string | null;
  readonly assignedByUserId: string | null;
  readonly assignedAt: string | null;
  readonly isLocked: boolean;

  readonly lifecycleStatus: SharedBatchLifecycleStatus;

  readonly totalBeneficiaries: number;
  readonly assignedBeneficiaries: number;
  /**
   * Batch-level counters carried by SharedBatch itself. Nothing in the live workflow
   * ever increments these, so they read 0 even for fully processed batches - see the
   * queue-derived completedTransactionCount / returnedTransactionCount below, which are
   * live. Both are projected because they are genuinely different values; recorded in
   * TECH_DEBT.md rather than reconciled here, which would be a business-logic change.
   */
  readonly completedBeneficiaries: number;
  readonly returnedBeneficiaries: number;
  readonly duplicateReferenceCount: number;
  readonly manualReviewCount: number;

  /** Assignment triage counts, from the Assignment record. Null when unassigned. */
  readonly assignmentReadyCount: number | null;
  readonly assignmentManualReviewCount: number | null;
  readonly assignmentInvalidCount: number | null;

  /**
   * Most recent reassignment only. SharedBatch stores no reassignment history, so these
   * must never be used to build an Assignment History report (D-5).
   */
  readonly lastReassignedByUserId: string | null;
  readonly lastReassignedAt: string | null;
  readonly lastReassignmentReason: string | null;

  /** Live rollup from proofDownloadService.getBatchDownloadSummary. Null when unassigned. */
  readonly proofImageCount: number | null;
  readonly completedTransactionCount: number | null;
  readonly returnedTransactionCount: number | null;

  readonly projectedAt: string;
}

/**
 * Grain: one branch.
 *
 * Carries no usdValue, revenue or liquidity field: REPORTING_STANDARDS.md places
 * financial metrics out of scope, and BranchPerformanceRow already violates that
 * (TECH_DEBT.md).
 */
export interface BranchReportProjection extends Record<string, unknown> {
  readonly branchId: string;
  readonly branchName: string;

  readonly batchCount: number;
  readonly batchesAssigned: number;
  readonly batchesProcessing: number;
  readonly batchesCompleted: number;
  readonly batchesReadyForDownload: number;
  readonly batchesDownloaded: number;

  /** Verbatim from branchProcessingQueueService.getBranchProcessingQueueSummary. */
  readonly queueAssigned: number;
  readonly queueInProgress: number;
  readonly queueOnHold: number;
  readonly queueCompleted: number;
  readonly queueReturned: number;
  readonly queueRemaining: number;
  readonly queueTotal: number;
  readonly queueCompletionPercentage: number;

  readonly branchProcessingStatus: BranchProcessingStatus;

  readonly proofImageCount: number;

  /**
   * Average of this branch's completed transactions' processingMinutes (Decision D-6,
   * unblocked). Null when the branch has no completed transaction with both a startedAt
   * and a completedAt - not the same as zero.
   */
  readonly averageProcessingMinutes: number | null;

  readonly projectedAt: string;
}

/**
 * Grain: one transaction (one BranchProcessingQueueItem).
 *
 * Carries the five-value BranchProcessingQueueStatus, not the three-value
 * CreditToAccountTransactionStatus: proofDownloadService.toTransactionStatus collapses
 * ASSIGNED, IN_PROGRESS and ON_HOLD into PENDING, which would make on-hold work
 * indistinguishable (REPORTING_PROJECTION_LAYER.md Section 4.4). Consumers needing the
 * narrower vocabulary map down; the layer never maps up.
 *
 * currency and amount are transaction attributes that identify a payment instruction,
 * not financial metrics. No projection sums them and no report may total them.
 */
export interface ProcessingReportProjection extends Record<string, unknown> {
  readonly queueItemId: string;
  readonly assignmentId: string;
  readonly branchId: string;
  readonly branchName: string | null;
  readonly sharedBatchId: string | null;
  readonly batchReference: string | null;

  readonly directRemitReference: string;
  readonly beneficiaryName: string;
  readonly transactionDate: string;
  readonly currency: string;
  readonly amount: number;
  readonly destinationCountry: string;
  readonly bankName: string;
  readonly accountNumber: string;

  readonly queueStatus: BranchProcessingQueueStatus;

  /** When this item entered the branch's processing queue - not the same as transactionDate, which is the underlying remittance's real-world date. */
  readonly createdAt: string;

  /**
   * Timestamps and actor attribution (Decision D-6, unblocked). startedAt is set once,
   * on the first transition into IN_PROGRESS - resuming from ON_HOLD does not reset it.
   * processingMinutes is null unless both startedAt and completedAt are present; it is
   * not computed for RETURNED transactions, which have no completion.
   */
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly completedByUserId: string | null;
  readonly returnedAt: string | null;
  readonly returnedByUserId: string | null;
  readonly processingMinutes: number | null;

  readonly returnReasonId: string | null;
  readonly returnReasonCode: string | null;
  readonly returnReasonName: string | null;
  readonly returnComment: string | null;

  readonly proofCount: number;
  readonly hasProof: boolean;

  readonly manualReviewRequired: boolean;
  readonly manualReviewReason: string | null;

  readonly projectedAt: string;
}

/**
 * Grain: one payout account (Liquidity Management, LIQUIDITY_MANAGEMENT.md Section 6-7).
 *
 * reservedBalance/availableBalance are computed here from
 * branchProcessingQueueService.getReservedAmountForAccount - the same function
 * startBranchProcessingQueueItem itself calls for its own sufficiency check (Section
 * 7.2). This layer does not recompute the reservation logic; it calls the one place that
 * owns it.
 */
export interface LiquidityAccountProjection extends Record<string, unknown> {
  readonly accountId: string;
  readonly branchId: string;
  readonly branchName: string | null;

  readonly bank: string;
  readonly accountNumber: string;
  readonly currency: string;

  readonly currentBalance: number;
  readonly reservedBalance: number;
  readonly availableBalance: number;
  readonly minimumThreshold: number;

  readonly status: PayoutAccountStatus;
  readonly health: BranchHealth;

  readonly lastUpdatedAt: string;
  readonly lastUpdatedByUserId: string;

  readonly projectedAt: string;
}

/**
 * Grain: one branch's liquidity position (Liquidity Management).
 *
 * Sums only ACTIVE accounts - a disabled account's balance is visible on
 * LiquidityAccountProjection but does not count toward branch totals, matching
 * LIQUIDITY_MANAGEMENT.md Section 7.4 ("disabling is not deletion").
 */
export interface LiquidityBranchProjection extends Record<string, unknown> {
  readonly branchId: string;
  readonly branchName: string;

  readonly accountCount: number;
  readonly totalLiquidity: number;
  readonly reservedLiquidity: number;
  readonly availableLiquidity: number;

  /** Sum of amounts for ASSIGNED queue items - work with no account committed yet. */
  readonly pendingProcessing: number;
  /** Sum of amounts for queue items COMPLETED today (Sprint 17 M4 / Decision D-6 data). */
  readonly consumptionToday: number;
  /** Sum of FundingEvent.totalAmount for events recorded today. */
  readonly fundingToday: number;

  readonly health: BranchHealth;

  readonly projectedAt: string;
}

/** Grain: one funding event (Liquidity Management, LIQUIDITY_MANAGEMENT.md Section 7.3). */
export interface FundingEventProjection extends Record<string, unknown> {
  readonly fundingEventId: string;
  readonly branchId: string;
  readonly branchName: string | null;

  readonly accountCount: number;
  readonly totalAmount: number;
  readonly reference: string | null;
  readonly notes: string | null;

  readonly updatedByUserId: string;
  readonly updatedAt: string;

  readonly projectedAt: string;
}

/**
 * Grain: one proof-of-payment file.
 *
 * previewUrl is deliberately never projected: it is a transient URL.createObjectURL
 * blob handle, meaningless outside the session that created it and useless in an export.
 */
export interface ProofReportProjection extends Record<string, unknown> {
  readonly proofId: string;
  readonly queueItemId: string;
  readonly directRemitReference: string;

  readonly sharedBatchId: string | null;
  readonly batchReference: string | null;
  readonly branchId: string;

  readonly fileName: string;
  readonly fileType: string;
  readonly fileSize: number;

  readonly uploadedByUserId: string;
  readonly uploadedAt: string;

  readonly expiresAt: string;
  /**
   * Read-time comparison of expiresAt against projectedAt. Observation only - it writes
   * nothing and changes no status. Nothing in REOS ever sets a proof to EXPIRED (no
   * scheduler is permitted), so a proof can legitimately read isExpired: true while its
   * status is still TEMPORARY. Whether download eligibility should enforce expiresAt
   * remains PROOF_MANAGEMENT.md Open Decision 3.
   */
  readonly isExpired: boolean;
  readonly status: ProofOfPaymentFileStatus;

  readonly projectedAt: string;
}
