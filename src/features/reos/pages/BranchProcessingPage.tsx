import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BranchProcessingQueue } from "../components/BranchProcessingQueue";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import {
  ProofDownloadNavigation,
  type ProofDownloadNavigationTarget,
} from "../components/ProofDownloadNavigation";
import { useReosSession } from "../layout/reosAuthContext";
import { getAssignmentsByBranch, getSharedBatch } from "../services/sharedBatchStore";
import type { Assignment } from "../types/assignment";
import type { SharedBatch } from "../types/sharedBatch";

export function BranchProcessingPage() {
  const { branchId = "" } = useParams();
  const { session } = useReosSession();
  const [branchAssignments, setBranchAssignments] = useState<Assignment[]>([]);
  const [proofDownloadTargets, setProofDownloadTargets] = useState<ProofDownloadNavigationTarget[]>([]);

  useEffect(() => {
    let cancelled = false;

    getAssignmentsByBranch(branchId).then((assignments) => {
      if (!cancelled) {
        setBranchAssignments(assignments);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const branchName = branchAssignments[0]?.assignedBranchName ?? branchId;

  // Branch Processing finishes at COMPLETED, so COMPLETED is the entry point into
  // Proof Management. READY_FOR_DOWNLOAD is also shown so an already-opened batch
  // stays reachable if the officer navigates away and back. DOWNLOADED batches are
  // excluded - their workflow is finished.
  useEffect(() => {
    let cancelled = false;
    const sharedBatchIds = [...new Set(branchAssignments.map((assignment) => assignment.sharedBatchId))];

    Promise.all(sharedBatchIds.map((sharedBatchId) => getSharedBatch(sharedBatchId))).then((sharedBatches) => {
      if (cancelled) {
        return;
      }

      const targets = sharedBatches
        .filter((sharedBatch): sharedBatch is SharedBatch =>
          sharedBatch?.lifecycleStatus === "COMPLETED" || sharedBatch?.lifecycleStatus === "READY_FOR_DOWNLOAD")
        .map((sharedBatch) => ({
          sharedBatchId: sharedBatch.id,
          sharedBatchReference: sharedBatch.reference,
        }));

      setProofDownloadTargets(targets);
    });

    return () => {
      cancelled = true;
    };
  }, [branchAssignments]);

  return (
    <PageContainer>
      <PageHeader
        description="Branch processing queue for the selected branch."
        title="Branch Processing"
      />
      <BranchProcessingQueue actorUserId={session?.userId ?? ""} assignments={branchAssignments} branchId={branchId} branchName={branchName} />
      <ProofDownloadNavigation targets={proofDownloadTargets} />
    </PageContainer>
  );
}
