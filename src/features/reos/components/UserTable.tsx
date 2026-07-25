import type { User } from "../types/user";
import { RoleBadge } from "./RoleBadge";
import { UserStatusBadge } from "./UserStatusBadge";

type UserTableProps = {
  users: User[];
  onViewUser?: (userId: string) => void;
  onEditUser?: (userId: string) => void;
};

export function UserTable({ users, onViewUser, onEditUser }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No users have been created.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
          <tr>
            <th className="px-4 py-3">Employee ID</th>
            <th className="px-4 py-3">Full Name</th>
            <th className="px-4 py-3">Username</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Branch</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last Login</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{user.employeeId}</td>
              <td className="px-4 py-3 text-slate-700">{user.fullName}</td>
              <td className="px-4 py-3 text-slate-700">{user.username}</td>
              <td className="px-4 py-3">
                <RoleBadge role={user.role} />
              </td>
              <td className="px-4 py-3 text-slate-700">{user.branchId ?? "All branches"}</td>
              <td className="px-4 py-3">
                <UserStatusBadge status={user.status} accountLocked={user.accountLocked} />
              </td>
              <td className="px-4 py-3 text-slate-700">{user.lastLoginAt ?? "Never"}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button className="text-sm font-medium text-blue-700" type="button" onClick={() => onViewUser?.(user.id)}>
                    View
                  </button>
                  <button className="text-sm font-medium text-blue-700" type="button" onClick={() => onEditUser?.(user.id)}>
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
