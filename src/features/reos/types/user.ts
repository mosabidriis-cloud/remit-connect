export type ReosUserRole =
  | "OPERATIONS_MANAGER"
  | "DIRECT_REMIT_OFFICER"
  | "BRANCH_OFFICER";

export type ReosUserStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface User {
  id: string;
  employeeId: string;
  username: string;
  passwordHash: string;
  fullName: string;
  organization: string;
  role: ReosUserRole;
  branchId: string | null;
  account: string;
  status: ReosUserStatus;
  accountLocked: boolean;
  forcePasswordChange: boolean;
  failedLoginAttempts: number;
  passwordChangedAt: string | null;
  lastLoginAt: string | null;
  createdBy: string;
  createdAt: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export type UserCreateInput = Omit<
  User,
  "id" | "failedLoginAttempts" | "passwordChangedAt" | "lastLoginAt" | "createdAt" | "lastUpdatedAt"
>;

export type UserUpdateInput = Partial<
  Omit<User, "id" | "createdBy" | "createdAt">
> & {
  lastUpdatedBy: string;
};
