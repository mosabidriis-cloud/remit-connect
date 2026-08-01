import { StatusBadge } from "./common/StatusBadge";
import type { ReosUserStatus } from "../types/user";

type UserStatusBadgeProps = {
  status: ReosUserStatus;
  accountLocked: boolean;
};

export function UserStatusBadge({ status, accountLocked }: UserStatusBadgeProps) {
  const label = accountLocked ? "LOCKED" : status;
  const tone = accountLocked ? "red" : status === "ACTIVE" ? "emerald" : "slate";

  return <StatusBadge label={label} tone={tone} />;
}
