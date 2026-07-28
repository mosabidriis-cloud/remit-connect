import type { SharedBatch } from "../types/sharedBatch";

type SharedBatchSummaryProps = {
  sharedBatch: SharedBatch;
};

export function SharedBatchSummary({ sharedBatch }: SharedBatchSummaryProps) {
  return (
    <div className="grid gap-4 rounded border border-slate-200 bg-white p-6 md:grid-cols-3">
      <SummaryItem label="Batch Reference" value={sharedBatch.reference} />
      <SummaryItem label="File Name" value={sharedBatch.fileName} />
      <SummaryItem label="Total Beneficiaries" value={String(sharedBatch.totalBeneficiaries)} />
      <SummaryItem label="Manual Review" value={String(sharedBatch.manualReviewCount)} />
      <SummaryItem label="Duplicate References" value={String(sharedBatch.duplicateReferenceCount)} />
      <SummaryItem label="Assigned Beneficiaries" value={String(sharedBatch.assignedBeneficiaries)} />
      <SummaryItem label="Assigned Branch" value={sharedBatch.assignedBranchId ?? "Unassigned"} />
      <SummaryItem label="Batch Lock" value={sharedBatch.isLocked ? "Locked" : "Unlocked"} />
      <SummaryItem label="Assignment Status" value={sharedBatch.assignmentStatus} />
    </div>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-950">{value}</span>
    </div>
  );
}
