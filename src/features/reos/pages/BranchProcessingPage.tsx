import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { BranchProcessingQueue } from "../components/BranchProcessingQueue";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getAssignmentsByBranch } from "../services/sharedBatchStore";

export function BranchProcessingPage() {
  const { branchId = "" } = useParams();

  const branchAssignments = useMemo(() => getAssignmentsByBranch(branchId), [branchId]);

  const branchName = branchAssignments[0]?.assignedBranchName ?? branchId;

  return (
    <PageContainer>
      <PageHeader
        description="Branch processing queue for the selected branch."
        title="Branch Processing"
      />
      <BranchProcessingQueue assignments={branchAssignments} branchId={branchId} branchName={branchName} />
    </PageContainer>
  );
}
