import type { FormEvent } from "react";
import { getAllBranches } from "../services/branchRegistryService";

export type BranchAssignmentFormValues = {
  branchId: string;
  reassignmentReason: string;
};

type BranchAssignmentFormProps = {
  onSubmit: (values: BranchAssignmentFormValues) => void;
};

const branches = getAllBranches();

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
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Destination Branch
          <select
            className="rounded border border-slate-300 px-3 py-2"
            defaultValue={branches[0]?.id ?? ""}
            name="branchId"
            required
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
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
