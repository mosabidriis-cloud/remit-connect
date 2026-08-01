import type { User } from "../types/user";
import { EmptyState } from "./common/EmptyState";
import { DataTable, type DataTableColumn } from "./common/DataTable";
import { RoleBadge } from "./RoleBadge";
import { UserStatusBadge } from "./UserStatusBadge";

type UserTableProps = {
  users: User[];
  onViewUser?: (userId: string) => void;
  onEditUser?: (userId: string) => void;
};

export function UserTable({ users, onViewUser, onEditUser }: UserTableProps) {
  if (users.length === 0) {
    return <EmptyState message="No users have been created." />;
  }

  const columns: DataTableColumn<User>[] = [
    {
      key: "employeeId",
      header: "Employee ID",
      render: (user) => <span className="font-medium text-slate-900">{user.employeeId}</span>,
    },
    {
      key: "fullName",
      header: "Full Name",
      render: (user) => <span className="text-slate-700">{user.fullName}</span>,
    },
    {
      key: "username",
      header: "Username",
      render: (user) => <span className="text-slate-700">{user.username}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (user) => <RoleBadge role={user.role} />,
    },
    {
      key: "branch",
      header: "Branch",
      render: (user) => <span className="text-slate-700">{user.branchId ?? "All branches"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (user) => <UserStatusBadge status={user.status} accountLocked={user.accountLocked} />,
    },
    {
      key: "lastLogin",
      header: "Last Login",
      render: (user) => <span className="text-slate-700">{user.lastLoginAt ?? "Never"}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (user) => (
        <div className="flex justify-end gap-2">
          <button className="text-sm font-medium text-blue-700" type="button" onClick={() => onViewUser?.(user.id)}>
            View
          </button>
          <button className="text-sm font-medium text-blue-700" type="button" onClick={() => onEditUser?.(user.id)}>
            Edit
          </button>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} getRowKey={(user) => user.id} rows={users} />;
}
