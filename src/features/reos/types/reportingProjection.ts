import type {
  BranchProcessingQueueStatus,
  BranchProcessingStatus,
} from "../services/branchProcessingQueueService";
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
 * Fields blocked by open decisions (D-5 audit trail, D-6 processing timestamps and
 * actor attribution, D-7 branch registry) are deliberately omitted rather than
 * declared as permanently-null - see REPORTING_PROJECTION_LAYER.md Section 4.6.
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
 * (TECH_DEBT.md). Carries no processing-speed field either - blocked by D-6.
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
