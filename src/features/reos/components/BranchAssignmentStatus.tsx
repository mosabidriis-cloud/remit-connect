import type { SharedBatchReassignmentAudit } from "../types/branchAssignment";
import type { SharedBatch } from "../types/sharedBatch";

type BranchAssignmentStatusProps = {
  sharedBatch: SharedBatch | null;
  audit: SharedBatchReassignmentAudit | null;
  error: string | null;
};

export function BranchAssignmentStatus({ sharedBatch, audit, error }: BranchAssignmentStatusProps) {
  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!sharedBatch) {
    return null;
  }

  return (
    <div className="grid gap-4 rounded border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Assignment Status</h2>
        <p className="text-sm text-slate-600">{sharedBatch.reference}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatusItem label="Assigned Branch" value={sharedBatch.assignedBranchId ?? "Unassigned"} />
        <StatusItem label="Locked" value={sharedBatch.isLocked ? "Yes" : "No"} />
        <StatusItem label="Assigned At" value={sharedBatch.assignedAt ?? "Not assigned"} />
        <StatusItem label="Assigned By" value={sharedBatch.assignedByUserId ?? "Not assigned"} />
        <StatusItem label="Total Beneficiaries" value={String(sharedBatch.totalBeneficiaries)} />
        <StatusItem label="Assigned Beneficiaries" value={String(sharedBatch.assignedBeneficiaries)} />
      </div>
      {audit ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Reassigned from {audit.previousBranchId} to {audit.newBranchId} by {audit.reassignedByUserId}.
        </div>
      ) : null}
    </div>
  );
}

type StatusItemProps = {
  label: string;
  value: string;
};

function StatusItem({ label, value }: StatusItemProps) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-950">{value}</span>
    </div>
  );
}
