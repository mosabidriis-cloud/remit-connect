import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../lib/database.types";
import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type { SharedBatch, SharedBatchAssignmentStatus, SharedBatchLifecycleStatus } from "../types/sharedBatch";

/**
 * Operational Persistence Milestone 1 (DEC-019, OPERATIONAL_PERSISTENCE.md). Supabase-
 * backed - the durable counterpart to REOS's most foundational operational data.
 * Every export keeps its exact original name and shape; only the implementation moved
 * from a `Map` to `shared_batches`/`beneficiaries`/`assignments`, and every function is
 * now `async`.
 *
 * `Assignment.assignedTransactions`/`manualReviewTransactions`/`invalidTransactions` are
 * NOT stored - they are reconstructed on every read from `beneficiaries`, filtered by
 * `processing_status_id` for the assignment's own `shared_batch_id`. This is exactly
 * what `assignmentService.createAssignment` already did with the in-memory array, and
 * `processing_status_id` is never mutated after a beneficiary is created, so this view
 * cannot drift from a stored duplicate that doesn't exist. See OPERATIONAL_PERSISTENCE.md
 * Section 1.
 */

type SharedBatchRow = Database["public"]["Tables"]["shared_batches"]["Row"];
type BeneficiaryRow = Database["public"]["Tables"]["beneficiaries"]["Row"];
type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"];

export async function saveSharedBatch(sharedBatch: SharedBatch): Promise<SharedBatch> {
  const { error } = await supabase.from("shared_batches").upsert(sharedBatchToRow(sharedBatch));

  if (error) {
    throw new Error(error.message);
  }

  return sharedBatch;
}

/**
 * The "I uploaded the wrong file" undo path (DEC-032) - removes an unassigned Shared
 * Batch and its beneficiaries entirely from the live workflow. RLS enforces the same
 * `assignment_status = 'UNASSIGNED'` guard server-side (assignSharedBatchToBranch's own
 * lock check mirrored as a DELETE policy), so this can never remove a batch already
 * handed to a branch, even if a caller somehow bypassed the client-side check.
 *
 * Deliberately does NOT touch the separate Import Intelligence ledger
 * (import_batches/import_beneficiaries via importIntelligenceService) - that ledger is a
 * durable evidence trail by design (IMPORT_INTELLIGENCE.md), meant to survive exactly
 * this kind of live-workflow undo: "this file was uploaded and later removed" remains
 * true and auditable even after the live batch is gone.
 */
export async function deleteSharedBatch(sharedBatchId: string): Promise<void> {
  const { error: beneficiariesError } = await supabase.from("beneficiaries").delete().eq("shared_batch_id", sharedBatchId);

  if (beneficiariesError) {
    throw new Error(beneficiariesError.message);
  }

  const { error: batchError } = await supabase.from("shared_batches").delete().eq("id", sharedBatchId);

  if (batchError) {
    throw new Error(batchError.message);
  }
}

export async function getSharedBatch(sharedBatchId: string): Promise<SharedBatch | null> {
  const { data, error } = await supabase.from("shared_batches").select("*").eq("id", sharedBatchId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToSharedBatch(data) : null;
}

/**
 * Persists the beneficiaries produced for a Shared Batch at upload time. Write-once -
 * called exactly once per batch, at upload (SharedBatchUploadPage.tsx); nothing in
 * REOS updates a beneficiary row after creation.
 */
export async function saveBeneficiaries(sharedBatchId: string, beneficiaries: Beneficiary[]): Promise<Beneficiary[]> {
  if (beneficiaries.length === 0) {
    return beneficiaries;
  }

  const { error } = await supabase
    .from("beneficiaries")
    .insert(beneficiaries.map((beneficiary) => beneficiaryToRow({ ...beneficiary, sharedBatchId })));

  if (error) {
    throw new Error(error.message);
  }

  return beneficiaries;
}

export async function getBeneficiaries(sharedBatchId: string): Promise<readonly Beneficiary[]> {
  const { data, error } = await supabase.from("beneficiaries").select("*").eq("shared_batch_id", sharedBatchId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToBeneficiary);
}

/**
 * Read by beneficiary id rather than shared_batch_id - Operational Persistence
 * Milestone 2 (branchProcessingQueueService.ts), which stores only a beneficiary_id on
 * each queue item and reconstructs the full Beneficiary at read time, the same
 * no-duplicate-storage approach Milestone 1 established for Assignment.
 */
export async function getBeneficiariesByIds(beneficiaryIds: readonly string[]): Promise<Beneficiary[]> {
  if (beneficiaryIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase.from("beneficiaries").select("*").in("id", [...beneficiaryIds]);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToBeneficiary);
}

export async function updateSharedBatchLifecycleStatus(
  sharedBatchId: string,
  lifecycleStatus: SharedBatchLifecycleStatus,
): Promise<SharedBatch | null> {
  const { data, error } = await supabase
    .from("shared_batches")
    .update({ lifecycle_status: lifecycleStatus })
    .eq("id", sharedBatchId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToSharedBatch(data) : null;
}

export async function saveAssignment(assignment: Assignment): Promise<Assignment> {
  const { error } = await supabase.from("assignments").upsert(assignmentToRow(assignment));

  if (error) {
    throw new Error(error.message);
  }

  return assignment;
}

export async function getAssignment(assignmentId: string): Promise<Assignment | null> {
  const { data, error } = await supabase.from("assignments").select("*").eq("id", assignmentId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const beneficiaries = await getBeneficiaries(data.shared_batch_id);
  return hydrateAssignment(data, beneficiaries);
}

export async function getAssignmentsByBranch(branchId: string): Promise<Assignment[]> {
  const { data, error } = await supabase.from("assignments").select("*").eq("assigned_branch_id", branchId);

  if (error) {
    throw new Error(error.message);
  }

  return hydrateAssignments(data ?? []);
}

/**
 * Read-only enumeration of every Shared Batch (Sprint 16 M4.1, DECISIONS.md DEC-007 /
 * REPORTING_PROJECTION_LAYER.md D-4) - now a durable query rather than a Map dump.
 * Ordering is not part of this contract - callers apply their own deterministic sort
 * (REPORTING_PROJECTION_LAYER.md Section 9.5).
 */
export async function getAllSharedBatches(): Promise<readonly SharedBatch[]> {
  const { data, error } = await supabase.from("shared_batches").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToSharedBatch);
}

/**
 * Read-only enumeration of every Assignment (Sprint 16 M4.1, DECISIONS.md DEC-007 /
 * REPORTING_PROJECTION_LAYER.md D-4). Creating or updating an Assignment remains
 * exclusive to branchAssignmentService (DEC-006); this only reads.
 */
export async function getAllAssignments(): Promise<readonly Assignment[]> {
  const { data, error } = await supabase.from("assignments").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return hydrateAssignments(data ?? []);
}

/** Batches one beneficiaries query for every assignment row, rather than one query per assignment. */
async function hydrateAssignments(rows: AssignmentRow[]): Promise<Assignment[]> {
  if (rows.length === 0) {
    return [];
  }

  const sharedBatchIds = [...new Set(rows.map((row) => row.shared_batch_id))];
  const { data, error } = await supabase.from("beneficiaries").select("*").in("shared_batch_id", sharedBatchIds);

  if (error) {
    throw new Error(error.message);
  }

  const beneficiariesByBatchId = new Map<string, Beneficiary[]>();
  (data ?? []).forEach((row) => {
    const beneficiary = mapRowToBeneficiary(row);
    const existing = beneficiariesByBatchId.get(row.shared_batch_id) ?? [];
    existing.push(beneficiary);
    beneficiariesByBatchId.set(row.shared_batch_id, existing);
  });

  return rows.map((row) => hydrateAssignment(row, beneficiariesByBatchId.get(row.shared_batch_id) ?? []));
}

function hydrateAssignment(row: AssignmentRow, beneficiaries: readonly Beneficiary[]): Assignment {
  const assignedTransactions = beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "READY_FOR_ASSIGNMENT");
  const manualReviewTransactions = beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "MANUAL_REVIEW");
  const invalidTransactions = beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "INVALID");

  return {
    id: row.id,
    sharedBatchId: row.shared_batch_id,
    batchReference: row.batch_reference,
    assignedBranchId: row.assigned_branch_id,
    assignedBranchName: row.assigned_branch_name,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    readyTransactionCount: row.ready_transaction_count,
    manualReviewCount: row.manual_review_count,
    invalidCount: row.invalid_count,
    assignedTransactions,
    manualReviewTransactions,
    invalidTransactions,
    status: row.status as Assignment["status"],
  };
}

function sharedBatchToRow(sharedBatch: SharedBatch): Database["public"]["Tables"]["shared_batches"]["Insert"] {
  return {
    id: sharedBatch.id,
    reference: sharedBatch.reference,
    file_name: sharedBatch.fileName,
    upload_date: sharedBatch.uploadDate,
    uploaded_by_user_id: sharedBatch.uploadedByUserId,
    total_beneficiaries: sharedBatch.totalBeneficiaries,
    assigned_beneficiaries: sharedBatch.assignedBeneficiaries,
    completed_beneficiaries: sharedBatch.completedBeneficiaries,
    returned_beneficiaries: sharedBatch.returnedBeneficiaries,
    duplicate_reference_count: sharedBatch.duplicateReferenceCount,
    manual_review_count: sharedBatch.manualReviewCount,
    assignment_status: sharedBatch.assignmentStatus,
    lifecycle_status: sharedBatch.lifecycleStatus,
    assigned_branch_id: sharedBatch.assignedBranchId,
    assigned_by_user_id: sharedBatch.assignedByUserId,
    assigned_at: sharedBatch.assignedAt,
    is_locked: sharedBatch.isLocked,
    last_reassigned_by_user_id: sharedBatch.lastReassignedByUserId,
    last_reassigned_at: sharedBatch.lastReassignedAt,
    last_reassignment_reason: sharedBatch.lastReassignmentReason,
  };
}

function mapRowToSharedBatch(row: SharedBatchRow): SharedBatch {
  return {
    id: row.id,
    reference: row.reference,
    fileName: row.file_name,
    uploadDate: row.upload_date,
    uploadedByUserId: row.uploaded_by_user_id,
    totalBeneficiaries: row.total_beneficiaries,
    assignedBeneficiaries: row.assigned_beneficiaries,
    completedBeneficiaries: row.completed_beneficiaries,
    returnedBeneficiaries: row.returned_beneficiaries,
    duplicateReferenceCount: row.duplicate_reference_count,
    manualReviewCount: row.manual_review_count,
    assignmentStatus: row.assignment_status as SharedBatchAssignmentStatus,
    lifecycleStatus: row.lifecycle_status as SharedBatchLifecycleStatus,
    assignedBranchId: row.assigned_branch_id,
    assignedByUserId: row.assigned_by_user_id,
    assignedAt: row.assigned_at,
    isLocked: row.is_locked,
    lastReassignedByUserId: row.last_reassigned_by_user_id,
    lastReassignedAt: row.last_reassigned_at,
    lastReassignmentReason: row.last_reassignment_reason,
  };
}

function beneficiaryToRow(beneficiary: Beneficiary): Database["public"]["Tables"]["beneficiaries"]["Insert"] {
  return {
    id: beneficiary.id,
    shared_batch_id: beneficiary.sharedBatchId,
    direct_remit_reference: beneficiary.directRemitReference,
    transaction_date: /^\d{4}-\d{2}-\d{2}$/.test(beneficiary.transactionDate) ? beneficiary.transactionDate : null,
    beneficiary_name: beneficiary.beneficiaryName,
    currency: beneficiary.currency,
    amount: beneficiary.amount,
    destination_country: beneficiary.destinationCountry || null,
    bank_name: beneficiary.bankName || null,
    account_number: beneficiary.accountNumber || null,
    processing_status_id: beneficiary.processingStatusId,
    return_reason_id: beneficiary.returnReasonId,
    receipt_uploaded: beneficiary.receiptUploaded,
    manual_review_required: beneficiary.manualReviewRequired,
    manual_review_reason: beneficiary.manualReviewReason,
  };
}

function mapRowToBeneficiary(row: BeneficiaryRow): Beneficiary {
  return {
    id: row.id,
    directRemitReference: row.direct_remit_reference,
    transactionDate: row.transaction_date ?? "",
    beneficiaryName: row.beneficiary_name,
    currency: row.currency,
    amount: row.amount,
    destinationCountry: row.destination_country ?? "",
    bankName: row.bank_name ?? "",
    accountNumber: row.account_number ?? "",
    sharedBatchId: row.shared_batch_id,
    assignedBranchId: null,
    processingStatusId: row.processing_status_id,
    returnReasonId: row.return_reason_id,
    receiptUploaded: row.receipt_uploaded,
    manualReviewRequired: row.manual_review_required,
    manualReviewReason: row.manual_review_reason,
  };
}

function assignmentToRow(assignment: Assignment): Database["public"]["Tables"]["assignments"]["Insert"] {
  return {
    id: assignment.id,
    shared_batch_id: assignment.sharedBatchId,
    batch_reference: assignment.batchReference,
    assigned_branch_id: assignment.assignedBranchId,
    assigned_branch_name: assignment.assignedBranchName,
    assigned_by: assignment.assignedBy,
    assigned_at: assignment.assignedAt,
    ready_transaction_count: assignment.readyTransactionCount,
    manual_review_count: assignment.manualReviewCount,
    invalid_count: assignment.invalidCount,
    status: assignment.status,
  };
}
