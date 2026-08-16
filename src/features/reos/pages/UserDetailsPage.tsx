import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/common/EmptyState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
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
      <PageContainer>
        <PageHeader
          description="View an internal REOS user account."
          title="User Details"
        />
        <EmptyState message="User not found." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        actions={
          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="button" onClick={() => navigate(`/reos/administration/users/${userId}/edit`)}>
            Edit User
          </button>
        }
        description={user.employeeId}
        title={user.fullName}
      />
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
        <Detail label="Last Login" value={user.lastLoginAt ?? "Never"} />
        <Detail label="Created By" value={user.createdBy ?? "—"} />
        <Detail label="Created At" value={user.createdAt} />
        <Detail label="Last Updated By" value={user.lastUpdatedBy ?? "—"} />
        <Detail label="Last Updated At" value={user.lastUpdatedAt} />
      </div>
    </PageContainer>
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
