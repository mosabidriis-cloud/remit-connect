import type { FormEvent } from "react";
import type { ReosUserRole } from "../types/user";

export type BranchAssignmentFormValues = {
  sharedBatchId: string;
  sharedBatchReference: string;
  fileName: string;
  uploadedByUserId: string;
  totalBeneficiaries: number;
  actorRole: ReosUserRole;
  actorUserId: string;
  branchId: string;
  reassignmentReason: string;
};

type BranchAssignmentFormProps = {
  onSubmit: (values: BranchAssignmentFormValues) => void;
};

export function BranchAssignmentForm({ onSubmit }: BranchAssignmentFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    onSubmit({
      sharedBatchId: String(formData.get("sharedBatchId") ?? ""),
      sharedBatchReference: String(formData.get("sharedBatchReference") ?? ""),
      fileName: String(formData.get("fileName") ?? ""),
      uploadedByUserId: String(formData.get("uploadedByUserId") ?? ""),
      totalBeneficiaries: Number(formData.get("totalBeneficiaries") ?? 0),
      actorRole: String(formData.get("actorRole")) as ReosUserRole,
      actorUserId: String(formData.get("actorUserId") ?? ""),
      branchId: String(formData.get("branchId") ?? ""),
      reassignmentReason: String(formData.get("reassignmentReason") ?? ""),
    });
  };

  return (
    <form className="grid gap-4 rounded border border-slate-200 bg-white p-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Shared Batch ID" name="sharedBatchId" required />
        <Field label="Shared Batch Reference" name="sharedBatchReference" required />
        <Field label="File Name" name="fileName" required />
        <Field label="Uploaded By User ID" name="uploadedByUserId" required />
        <Field label="Total Beneficiaries" min={1} name="totalBeneficiaries" required type="number" />
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Actor Role
          <select className="rounded border border-slate-300 px-3 py-2" name="actorRole">
            <option value="DIRECT_REMIT_OFFICER">Direct Remit Officer</option>
            <option value="OPERATIONS_MANAGER">Operations Manager</option>
            <option value="BRANCH_OFFICER">Branch Officer</option>
          </select>
        </label>
        <Field label="Actor User ID" name="actorUserId" required />
        <Field label="Assigned Branch ID" name="branchId" required />
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Reassignment Reason
        <textarea className="min-h-24 rounded border border-slate-300 px-3 py-2" name="reassignmentReason" />
      </label>
      <div>
        <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">
          Assign Shared Batch
        </button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  min?: number;
};

function Field({ label, name, required, type = "text", min }: FieldProps) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input className="rounded border border-slate-300 px-3 py-2" min={min} name={name} required={required} type={type} />
    </label>
  );
}
