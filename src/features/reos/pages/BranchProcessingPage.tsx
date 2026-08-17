import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BranchProcessingQueue } from "../components/BranchProcessingQueue";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { FundingRecorder } from "../components/FundingRecorder";
import { PayoutAccountManager } from "../components/PayoutAccountManager";
import {
  ProofDownloadNavigation,
  type ProofDownloadNavigationTarget,
} from "../components/ProofDownloadNavigation";
import { useReosSession } from "../layout/reosAuthContext";
import { getBranchById } from "../services/branchRegistryService";
import { getAssignmentsByBranch, getSharedBatch } from "../services/sharedBatchStore";
import type { Assignment } from "../types/assignment";
import type { SharedBatch } from "../types/sharedBatch";

export function BranchProcessingPage() {
  const { branchId = "" } = useParams();
  const { session } = useReosSession();
  const [branchAssignments, setBranchAssignments] = useState<Assignment[]>([]);
  const [proofDownloadTargets, setProofDownloadTargets] = useState<ProofDownloadNavigationTarget[]>([]);
  // DEC-027: bumped after every payout account/funding write so both children re-fetch
  // and stay in sync - the same pattern LiquidityManagementPage.tsx already established
  // for these same two components.
  const [liquidityRefreshSignal, setLiquidityRefreshSignal] = useState(0);

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

  const branchName = getBranchById(branchId)?.name ?? branchAssignments[0]?.assignedBranchName ?? branchId;

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
      {session?.role === "BRANCH_OFFICER" ? (
        <>
          <PayoutAccountManager
            actorUserId={session.userId}
            branchId={branchId}
            onChange={() => setLiquidityRefreshSignal((value) => value + 1)}
            refreshSignal={liquidityRefreshSignal}
          />
          <FundingRecorder
            actorUserId={session.userId}
            branchId={branchId}
            onChange={() => setLiquidityRefreshSignal((value) => value + 1)}
            refreshSignal={liquidityRefreshSignal}
          />
        </>
      ) : null}
      <BranchProcessingQueue actorUserId={session?.userId ?? ""} assignments={branchAssignments} branchId={branchId} branchName={branchName} />
      <ProofDownloadNavigation targets={proofDownloadTargets} />
    </PageContainer>
  );
}
