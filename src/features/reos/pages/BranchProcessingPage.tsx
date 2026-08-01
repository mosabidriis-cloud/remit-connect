import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DataTable, type DataTableColumn } from "../components/common/DataTable";
import { EmptyState } from "../components/common/EmptyState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getActiveReturnReasons } from "../services/transactionProcessingService";
import type { BranchProcessingBatch } from "../types/transactionProcessing";

type BranchProcessingLocationState = {
  batches?: BranchProcessingBatch[];
};

export function BranchProcessingPage() {
  const { branchId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as BranchProcessingLocationState | null;
  const assignedBatches = (state?.batches ?? []).filter((batch) => batch.assignedBranchId === branchId);
  const returnReasons = getActiveReturnReasons();
  const columns: DataTableColumn<BranchProcessingBatch>[] = [
    {
      key: "reference",
      header: "Batch Reference",
      render: (batch) => <span className="font-medium text-slate-900">{batch.reference}</span>,
    },
    {
      key: "transactions",
      header: "Transactions",
      render: (batch) => batch.totalTransactions,
    },
    {
      key: "position",
      header: "Current Position",
      render: (batch) => `${batch.currentPosition} / ${batch.totalTransactions}`,
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (batch) => (
        <button
          className="text-sm font-medium text-blue-700"
          disabled={batch.transactions.length === 0}
          onClick={() =>
            navigate(`/reos/branches/${branchId}/processing/${batch.id}/transactions/${batch.transactions[0]?.id ?? ""}`, {
              state: {
                batch,
                transaction: batch.transactions[0],
                transactionIndex: 0,
                currentPosition: 1,
                totalTransactions: batch.totalTransactions,
                returnReasons,
                branchOfficerUserId: "BRANCH_OFFICER",
              },
            })
          }
          type="button"
        >
          Open
        </button>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        description={`Branch ${branchId} assigned batches only.`}
        title="Credit-to-Account Processing"
      />
      {assignedBatches.length === 0 ? (
        <EmptyState message="No assigned batches are available for this branch." />
      ) : (
        <DataTable columns={columns} getRowKey={(batch) => batch.id} rows={assignedBatches} />
      )}
    </PageContainer>
  );
}
