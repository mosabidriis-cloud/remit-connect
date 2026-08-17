import type { FormEvent } from "react";
import type { ReosUserRole, ReosUserStatus, User } from "../types/user";

export type UserFormValues = {
  employeeId: string;
  username: string;
  email: string;
  initialPassword: string;
  fullName: string;
  organization: string;
  role: ReosUserRole;
  branchId: string;
  account: string;
  status: ReosUserStatus;
  accountLocked: boolean;
  forcePasswordChange: boolean;
};

type UserFormProps = {
  initialUser?: User;
  /** Create provisions a real credential (email + initial password); edit never changes either. */
  mode: "create" | "edit";
  submitLabel: string;
  onSubmit: (values: UserFormValues) => void;
};

const roleOptions: Array<{ value: ReosUserRole; label: string }> = [
  { value: "OPERATIONS_MANAGER", label: "Operations Manager" },
  { value: "DIRECT_REMIT_OFFICER", label: "Direct Remit Officer" },
  { value: "BRANCH_OFFICER", label: "Branch Officer" },
];

const statusOptions: ReosUserStatus[] = ["ACTIVE", "INACTIVE"];

export function UserForm({ initialUser, mode, submitLabel, onSubmit }: UserFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const role = String(formData.get("role")) as ReosUserRole;
    const branchId = String(formData.get("branchId") ?? "");

    onSubmit({
      employeeId: String(formData.get("employeeId") ?? ""),
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? initialUser?.email ?? ""),
      initialPassword: String(formData.get("initialPassword") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      organization: String(formData.get("organization") ?? ""),
      role,
      branchId: role === "OPERATIONS_MANAGER" ? "" : branchId,
      account: String(formData.get("account") ?? ""),
      status: String(formData.get("status")) as ReosUserStatus,
      accountLocked: formData.get("accountLocked") === "on",
      forcePasswordChange: formData.get("forcePasswordChange") === "on",
    });
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Employee ID
          <input className="rounded border border-slate-300 px-3 py-2" defaultValue={initialUser?.employeeId} name="employeeId" required />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Username
          <input className="rounded border border-slate-300 px-3 py-2" defaultValue={initialUser?.username} name="username" required />
        </label>
        {mode === "create" ? (
          <>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Email (sign-in identity)
              <input className="rounded border border-slate-300 px-3 py-2" name="email" required type="email" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Initial Password
              <input className="rounded border border-slate-300 px-3 py-2" minLength={8} name="initialPassword" required type="password" />
            </label>
          </>
        ) : null}
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Full Name
          <input className="rounded border border-slate-300 px-3 py-2" defaultValue={initialUser?.fullName} name="fullName" required />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Organization
          <input className="rounded border border-slate-300 px-3 py-2" defaultValue={initialUser?.organization} name="organization" required />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Role
          <select className="rounded border border-slate-300 px-3 py-2" defaultValue={initialUser?.role ?? "BRANCH_OFFICER"} name="role">
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Branch ID
          <input className="rounded border border-slate-300 px-3 py-2" defaultValue={initialUser?.branchId ?? ""} name="branchId" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Position/Title (optional)
          <input className="rounded border border-slate-300 px-3 py-2" defaultValue={initialUser?.account} name="account" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Status
          <select className="rounded border border-slate-300 px-3 py-2" defaultValue={initialUser?.status ?? "ACTIVE"} name="status">
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input defaultChecked={initialUser?.accountLocked} name="accountLocked" type="checkbox" />
          Account locked
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input defaultChecked={initialUser?.forcePasswordChange ?? true} name="forcePasswordChange" type="checkbox" />
          Force password change
        </label>
      </div>
      <div>
        <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
