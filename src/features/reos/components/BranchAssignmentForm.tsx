import type { FormEvent } from "react";

export type BranchAssignmentFormValues = {
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
      branchId: String(formData.get("branchId") ?? ""),
      reassignmentReason: String(formData.get("reassignmentReason") ?? ""),
    });
  };

  return (
    <form className="grid gap-4 rounded border border-slate-200 bg-white p-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Destination Branch ID" name="branchId" required />
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
