export type ReosUserRole =
  | "OPERATIONS_MANAGER"
  | "DIRECT_REMIT_OFFICER"
  | "BRANCH_OFFICER";

export type ReosUserStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface User {
  id: string;
  email: string;
  employeeId: string;
  username: string;
  fullName: string;
  organization: string;
  role: ReosUserRole;
  branchId: string | null;
  account: string;
  status: ReosUserStatus;
  accountLocked: boolean;
  forcePasswordChange: boolean;
  lastLoginAt: string | null;
  createdBy: string | null;
  createdAt: string;
  lastUpdatedBy: string | null;
  lastUpdatedAt: string;
}

/**
 * Creating a user provisions a real Supabase Auth credential (AUTHENTICATION.md
 * Section 4) via the `admin-create-user` Edge Function - `email`/`initialPassword`
 * replace the old, never-real `passwordHash` text field. `createdBy` is supplied by
 * the caller (the acting Operations Manager's session), not the form.
 */
export type UserCreateInput = Omit<
  User,
  "id" | "lastLoginAt" | "createdAt" | "lastUpdatedAt" | "createdBy" | "lastUpdatedBy"
> & {
  initialPassword: string;
};

export type UserUpdateInput = Partial<
  Omit<User, "id" | "email" | "createdBy" | "createdAt">
> & {
  lastUpdatedBy: string;
};
