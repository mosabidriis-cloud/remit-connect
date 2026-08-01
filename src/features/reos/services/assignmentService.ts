import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type { SharedBatch } from "../types/sharedBatch";

export interface CreateAssignmentInput {
  sharedBatch: SharedBatch;
  beneficiaries: Beneficiary[];
  branchId: string;
  branchName: string;
  assignedBy: string;
  assignedAt: string;
}

export function createAssignment(input: CreateAssignmentInput): Assignment {
  const readyTransactions = input.beneficiaries.filter(
    (beneficiary) => beneficiary.processingStatusId === "READY_FOR_ASSIGNMENT",
  );
  const manualReviewTransactions = input.beneficiaries.filter(
    (beneficiary) => beneficiary.processingStatusId === "MANUAL_REVIEW",
  );
  const invalidTransactions = input.beneficiaries.filter(
    (beneficiary) => beneficiary.processingStatusId === "INVALID",
  );

  return {
    id: `${input.sharedBatch.id}-assignment`,
    sharedBatchId: input.sharedBatch.id,
    batchReference: input.sharedBatch.reference,
    assignedBranchId: input.branchId,
    assignedBranchName: input.branchName,
    assignedBy: input.assignedBy,
    assignedAt: input.assignedAt,
    readyTransactionCount: readyTransactions.length,
    manualReviewCount: manualReviewTransactions.length,
    invalidCount: invalidTransactions.length,
    assignedTransactions: readyTransactions,
    manualReviewTransactions,
    invalidTransactions,
    status: "ASSIGNED",
  };
}
