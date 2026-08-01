import { useState } from "react";
import { BranchAssignedBatchView } from "../components/BranchAssignedBatchView";
import { BranchAssignmentForm, type BranchAssignmentFormValues } from "../components/BranchAssignmentForm";
import { BranchAssignmentStatus } from "../components/BranchAssignmentStatus";
import {
  assignSharedBatchToBranch,
  getSharedBatchesVisibleToBranchOfficer,
  reassignSharedBatch,
} from "../services/branchAssignmentService";
import type { SharedBatchReassignmentAudit } from "../types/branchAssignment";
import type { SharedBatch } from "../types/sharedBatch";

export function BranchAssignmentPage() {
  const [sharedBatch, setSharedBatch] = useState<SharedBatch | null>(null);
  const [audit, setAudit] = useState<SharedBatchReassignmentAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibleBatches = getSharedBatchesVisibleToBranchOfficer(sharedBatch ? [sharedBatch] : [], sharedBatch?.assignedBranchId ?? "");

  const handleSubmit = (values: BranchAssignmentFormValues) => {
    setError(null);

    try {
      const batch = sharedBatch ?? createUnassignedSharedBatch(values);
      const result = batch.assignmentStatus === "ASSIGNED"
        ? reassignSharedBatch({
            sharedBatch: batch,
            newBranchId: values.branchId,
            reassignedByUserId: values.actorUserId,
            actorRole: values.actorRole,
            reason: values.reassignmentReason,
          })
        : assignSharedBatchToBranch({
            sharedBatch: batch,
            branchId: values.branchId,
            assignedByUserId: values.actorUserId,
            actorRole: values.actorRole,
          });

      setSharedBatch(result.sharedBatch);
      setAudit(result.audit);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to assign Shared Batch.");
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-950">Branch Assignment</h1>
        <p className="mt-1 text-sm text-slate-600">Manually assign one Shared Batch to exactly one branch.</p>
      </header>
      <BranchAssignmentForm onSubmit={handleSubmit} />
      <BranchAssignmentStatus audit={audit} error={error} sharedBatch={sharedBatch} />
      <BranchAssignedBatchView branchId={sharedBatch?.assignedBranchId ?? ""} sharedBatches={visibleBatches} />
    </section>
  );
}

function createUnassignedSharedBatch(values: BranchAssignmentFormValues): SharedBatch {
  return {
    id: values.sharedBatchId,
    reference: values.sharedBatchReference,
    fileName: values.fileName,
    uploadDate: new Date().toISOString(),
    uploadedByUserId: values.uploadedByUserId,
    totalBeneficiaries: values.totalBeneficiaries,
    assignedBeneficiaries: 0,
    completedBeneficiaries: 0,
    returnedBeneficiaries: 0,
    duplicateReferenceCount: 0,
    manualReviewCount: 0,
    assignmentStatus: "UNASSIGNED",
    lifecycleStatus: "ASSIGNED",
    assignedBranchId: null,
    assignedByUserId: null,
    assignedAt: null,
    isLocked: false,
    lastReassignedByUserId: null,
    lastReassignedAt: null,
    lastReassignmentReason: null,
  };
}
