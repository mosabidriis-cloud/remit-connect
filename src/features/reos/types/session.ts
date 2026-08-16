import type { ReosUserRole, ReosUserStatus } from "./user";

/**
 * A real, authenticated REOS session (AUTHENTICATION.md Section 5) - the Supabase Auth
 * user joined with their `profiles` row. Replaces every hardcoded actor/role literal
 * that stood in for a session that didn't exist yet.
 */
export interface ReosSession {
  userId: string;
  email: string;
  employeeId: string;
  username: string;
  fullName: string;
  role: ReosUserRole;
  branchId: string | null;
  status: ReosUserStatus;
  accountLocked: boolean;
  forcePasswordChange: boolean;
}
