import { BatchLifecycleBadge } from "./BatchLifecycleBadge";
import type { SharedBatch } from "../types/sharedBatch";

type BranchAssignedBatchViewProps = {
  branchId: string;
  sharedBatches: SharedBatch[];
};

export function BranchAssignedBatchView({ branchId, sharedBatches }: BranchAssignedBatchViewProps) {
  if (!branchId) {
    return null;
  }

  if (sharedBatches.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No Shared Batches are visible for branch {branchId}.
      </div>
    );
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">Branch Officer View</h2>
      <ul className="mt-3 grid gap-2">
        {sharedBatches.map((sharedBatch) => (
          <li className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" key={sharedBatch.id}>
            <span>
              {sharedBatch.reference} is assigned to branch {sharedBatch.assignedBranchId}.
            </span>
            <BatchLifecycleBadge status={sharedBatch.lifecycleStatus} />
          </li>
        ))}
      </ul>
    </div>
  );
}
