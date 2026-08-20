/**
 * REOS v1.0 Production Readiness Phase 3 (OPERATIONAL_PERSISTENCE.md, DEC-022).
 * One audit vocabulary for every persisted business action, replacing the several
 * ad-hoc, previously-discarded shapes (`TransactionProcessingAudit`, now deleted with
 * TransactionProcessingPage; `ProofDownloadHistoryEntry`; `SharedBatchReassignmentAudit`).
 */
export type AuditAction =
  | "BATCH_UPLOADED"
  | "BATCH_CONFIRMED"
  | "BATCH_DELETED"
  | "BATCH_ASSIGNED"
  | "BATCH_REASSIGNED"
  | "BATCH_REQUESTED"
  | "TRANSACTION_STARTED"
  | "TRANSACTION_COMPLETED"
  | "TRANSACTION_RETURNED"
  | "TRANSACTION_ON_HOLD"
  | "BRANCH_PROCESSING_FINALIZED"
  | "PROOF_UPLOADED"
  | "PROOF_ZIP_DOWNLOADED"
  | "PROOF_DOWNLOADED"
  | "BATCH_MARKED_DOWNLOADED"
  | "PAYOUT_ACCOUNT_CREATED"
  | "PAYOUT_ACCOUNT_UPDATED"
  | "PAYOUT_ACCOUNT_STATUS_CHANGED"
  | "FUNDING_RECORDED"
  | "USER_CREATED"
  | "USER_UPDATED";

export type AuditEntityType =
  | "SHARED_BATCH"
  | "BATCH_REQUEST"
  | "ASSIGNMENT"
  | "QUEUE_ITEM"
  | "BRANCH"
  | "PROOF"
  | "PAYOUT_ACCOUNT"
  | "FUNDING_EVENT"
  | "USER";

export interface AuditEvent {
  id: string;
  actorUserId: string;
  actorRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  branchId: string | null;
  details: string;
  performedAt: string;
}

export interface RecordAuditEventInput {
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  branchId?: string | null;
  details: string;
  performedAt?: string;
}
