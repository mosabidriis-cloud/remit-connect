import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoleBadge } from "../components/RoleBadge";
import { UserStatusBadge } from "../components/UserStatusBadge";
import { getUserById } from "../services/userService";
import type { User } from "../types/user";

export function UserDetailsPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (userId) {
      void getUserById(userId).then(setUser);
    }
  }, [userId]);

  if (!user) {
    return (
      <section className="mx-auto grid w-full max-w-7xl gap-6">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-950">User Details</h1>
          <p className="mt-1 text-sm text-slate-600">View an internal REOS user account.</p>
        </header>
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          User not found.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{user.fullName}</h1>
          <p className="mt-1 text-sm text-slate-600">{user.employeeId}</p>
        </div>
        <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="button" onClick={() => navigate("edit")}>
          Edit User
        </button>
      </header>
      <div className="grid gap-4 rounded border border-slate-200 bg-white p-6 md:grid-cols-2">
        <Detail label="Username" value={user.username} />
        <Detail label="Organization" value={user.organization} />
        <div className="grid gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Role</span>
          <RoleBadge role={user.role} />
        </div>
        <Detail label="Branch" value={user.branchId ?? "All branches"} />
        <div className="grid gap-1">
          <span className="text-xs font-semibold uppercase text-slate-500">Status</span>
          <UserStatusBadge status={user.status} accountLocked={user.accountLocked} />
        </div>
        <Detail label="Failed Login Attempts" value={String(user.failedLoginAttempts)} />
        <Detail label="Last Login" value={user.lastLoginAt ?? "Never"} />
        <Detail label="Password Changed" value={user.passwordChangedAt ?? "Not recorded"} />
        <Detail label="Created By" value={user.createdBy} />
        <Detail label="Created At" value={user.createdAt} />
        <Detail label="Last Updated By" value={user.lastUpdatedBy} />
        <Detail label="Last Updated At" value={user.lastUpdatedAt} />
      </div>
    </section>
  );
}

type DetailProps = {
  label: string;
  value: string;
};

function Detail({ label, value }: DetailProps) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  );
}
