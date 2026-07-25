import type { ReosUserStatus } from "../types/user";

type UserStatusBadgeProps = {
  status: ReosUserStatus;
  accountLocked: boolean;
};

export function UserStatusBadge({ status, accountLocked }: UserStatusBadgeProps) {
  const label = accountLocked ? "LOCKED" : status;
  const className = accountLocked
    ? "bg-red-50 text-red-700 ring-red-200"
    : status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ring-1 ${className}`}>
      {label}
    </span>
  );
}
