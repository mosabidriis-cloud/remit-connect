import { useLocation, useNavigate, useParams } from "react-router-dom";
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

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Credit-to-Account Processing</h1>
        <p className="text-sm text-slate-600">Branch {branchId} assigned batches only.</p>
      </div>
      {assignedBatches.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No assigned batches are available for this branch.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Batch Reference</th>
                <th className="px-4 py-3">Transactions</th>
                <th className="px-4 py-3">Current Position</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignedBatches.map((batch) => (
                <tr key={batch.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{batch.reference}</td>
                  <td className="px-4 py-3 text-slate-700">{batch.totalTransactions}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {batch.currentPosition} / {batch.totalTransactions}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
