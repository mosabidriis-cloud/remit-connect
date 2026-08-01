import { useState } from "react";
import { BranchAssignedBatchView } from "../components/BranchAssignedBatchView";
import { BranchAssignmentForm, type BranchAssignmentFormValues } from "../components/BranchAssignmentForm";
import { BranchAssignmentStatus } from "../components/BranchAssignmentStatus";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import {
  assignSharedBatchToBranch,
  getSharedBatchesVisibleToBranchOfficer,
  reassignSharedBatch,
} from "../services/branchAssignmentService";
import { saveAssignment, saveSharedBatch } from "../services/sharedBatchStore";
import type { Assignment } from "../types/assignment";
import type { SharedBatchReassignmentAudit } from "../types/branchAssignment";
import type { SharedBatch } from "../types/sharedBatch";

export function BranchAssignmentPage() {
  const [sharedBatch, setSharedBatch] = useState<SharedBatch | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [audit, setAudit] = useState<SharedBatchReassignmentAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibleBatches = getSharedBatchesVisibleToBranchOfficer(sharedBatch ? [sharedBatch] : [], sharedBatch?.assignedBranchId ?? "");

  const handleSubmit = (values: BranchAssignmentFormValues) => {
    setError(null);

    try {
      const batch = sharedBatch ?? createUnassignedSharedBatch(values);
      const branchName = values.branchId === "PORT_SUDAN" ? "Port Sudan Branch" : values.branchId;

      if (batch.assignmentStatus === "ASSIGNED") {
        if (!assignment) {
          throw new Error("No existing Assignment was found to reassign.");
        }

        const result = reassignSharedBatch({
          sharedBatch: batch,
          newBranchId: values.branchId,
          newBranchName: branchName,
          reassignedByUserId: values.actorUserId,
          actorRole: values.actorRole,
          reason: values.reassignmentReason,
          assignment,
        });

        saveAssignment(result.assignment);
        saveSharedBatch(result.sharedBatch);
        setSharedBatch(result.sharedBatch);
        setAssignment(result.assignment);
        setAudit(result.audit);
        return;
      }

      const result = assignSharedBatchToBranch({
        sharedBatch: batch,
        beneficiaries: [],
        branchId: values.branchId,
        branchName,
        assignedByUserId: values.actorUserId,
        actorRole: values.actorRole,
      });

      saveAssignment(result.assignment);
      saveSharedBatch(result.sharedBatch);
      setSharedBatch(result.sharedBatch);
      setAssignment(result.assignment);
      setAudit(result.audit);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to assign Shared Batch.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        description="Manually assign one Shared Batch to exactly one branch."
        title="Branch Assignment"
      />
      <BranchAssignmentForm onSubmit={handleSubmit} />
      <BranchAssignmentStatus audit={audit} error={error} sharedBatch={sharedBatch} />
      <BranchAssignedBatchView branchId={sharedBatch?.assignedBranchId ?? ""} sharedBatches={visibleBatches} />
    </PageContainer>
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
