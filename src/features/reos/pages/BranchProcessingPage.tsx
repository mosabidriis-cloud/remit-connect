import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { BranchProcessingQueue } from "../components/BranchProcessingQueue";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import {
  ProofDownloadNavigation,
  type ProofDownloadNavigationTarget,
} from "../components/ProofDownloadNavigation";
import { getAssignmentsByBranch, getSharedBatch } from "../services/sharedBatchStore";
import type { SharedBatch } from "../types/sharedBatch";

export function BranchProcessingPage() {
  const { branchId = "" } = useParams();

  const branchAssignments = useMemo(() => getAssignmentsByBranch(branchId), [branchId]);

  const branchName = branchAssignments[0]?.assignedBranchName ?? branchId;

  // Branch Processing finishes at COMPLETED, so COMPLETED is the entry point into
  // Proof Management. READY_FOR_DOWNLOAD is also shown so an already-opened batch
  // stays reachable if the officer navigates away and back. DOWNLOADED batches are
  // excluded - their workflow is finished.
  const proofDownloadTargets = useMemo<ProofDownloadNavigationTarget[]>(() => {
    const sharedBatchIds = new Set(branchAssignments.map((assignment) => assignment.sharedBatchId));

    return Array.from(sharedBatchIds)
      .map((sharedBatchId) => getSharedBatch(sharedBatchId))
      .filter((sharedBatch): sharedBatch is SharedBatch =>
        sharedBatch?.lifecycleStatus === "COMPLETED" || sharedBatch?.lifecycleStatus === "READY_FOR_DOWNLOAD")
      .map((sharedBatch) => ({
        sharedBatchId: sharedBatch.id,
        sharedBatchReference: sharedBatch.reference,
      }));
  }, [branchAssignments]);

  return (
    <PageContainer>
      <PageHeader
        description="Branch processing queue for the selected branch."
        title="Branch Processing"
      />
      <BranchProcessingQueue assignments={branchAssignments} branchId={branchId} branchName={branchName} />
      <ProofDownloadNavigation targets={proofDownloadTargets} />
    </PageContainer>
  );
}
