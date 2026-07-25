import type { ReosUserRole } from "../types/user";

const roleLabels: Record<ReosUserRole, string> = {
  OPERATIONS_MANAGER: "Operations Manager",
  DIRECT_REMIT_OFFICER: "Direct Remit Officer",
  BRANCH_OFFICER: "Branch Officer",
};

type RoleBadgeProps = {
  role: ReosUserRole;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
      {roleLabels[role]}
    </span>
  );
}
