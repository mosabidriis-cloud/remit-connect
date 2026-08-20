import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../lib/database.types";
import { recordAuditEvent } from "./auditService";
import type { ReosUserRole, ReosUserStatus, User, UserCreateInput, UserUpdateInput } from "../types/user";

/**
 * User administration (AUTHENTICATION.md Section 4/8). Supabase-backed - the first
 * REOS store migrated from an in-memory array to a real repository, with every
 * exported function signature preserved from the original in-memory implementation.
 * Creating a user provisions a real credential via the `admin-create-user` Edge
 * Function (client-side code cannot safely create `auth.users` rows); every other
 * operation is a direct, RLS-authorized query against `profiles`.
 */

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

function mapRowToUser(row: ProfileRow, email: string): User {
  return {
    id: row.id,
    email,
    employeeId: row.employee_id,
    username: row.username,
    fullName: row.full_name,
    organization: row.organization,
    role: row.role as ReosUserRole,
    branchId: row.branch_id,
    account: row.account,
    status: row.status as ReosUserStatus,
    accountLocked: row.account_locked,
    forcePasswordChange: row.force_password_change,
    lastLoginAt: row.last_login_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    lastUpdatedBy: row.last_updated_by,
    lastUpdatedAt: row.last_updated_at,
  };
}

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // profiles carries no email column (Supabase Auth owns it) - not shown in a list of
  // every user, only needed when acting on one specific account.
  return (data ?? []).map((row) => mapRowToUser(row, ""));
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToUser(data, "") : null;
}

/**
 * Batched id -> full name lookup for "who did this" display columns (Funding History,
 * audit-style tables) - one query instead of one per row. RLS still applies per-row
 * (profiles_select_self_or_admin/profiles_select_branch_officers etc.), so an id the
 * caller isn't allowed to see is simply absent from the returned map, not an error.
 */
export async function getDisplayNamesByIds(ids: readonly string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((row) => [row.id, row.full_name]));
}

/**
 * `actorUserId` is separate from `input` - it identifies who is performing the creation
 * (for the audit trail only), not the account being created. Always the acting
 * Operations Manager's own session id; the bootstrap "first user" path never calls this
 * client function (nothing can be signed in yet to reach the Create User page in the
 * first place), so there is no actor-less case here to account for.
 */
export async function createUser(input: UserCreateInput, actorUserId: string): Promise<User> {
  const { data, error } = await supabase.functions.invoke<{ profile: ProfileRow }>("admin-create-user", {
    body: {
      email: input.email,
      initialPassword: input.initialPassword,
      employeeId: input.employeeId,
      username: input.username,
      fullName: input.fullName,
      organization: input.organization,
      role: input.role,
      branchId: input.branchId,
      account: input.account,
      status: input.status,
      accountLocked: input.accountLocked,
    },
  });

  if (error || !data?.profile) {
    throw new Error(error?.message ?? "Unable to create user.");
  }

  const user = mapRowToUser(data.profile, input.email);

  await recordAuditEvent({
    actorUserId,
    action: "USER_CREATED",
    entityType: "USER",
    entityId: user.id,
    branchId: user.branchId,
    details: `Created user ${user.username} (${user.role}).`,
  });

  return user;
}

export async function updateUser(id: string, input: UserUpdateInput): Promise<User | null> {
  const updates: Database["public"]["Tables"]["profiles"]["Update"] = {
    last_updated_by: input.lastUpdatedBy,
    last_updated_at: new Date().toISOString(),
  };

  if (input.employeeId !== undefined) updates.employee_id = input.employeeId;
  if (input.username !== undefined) updates.username = input.username;
  if (input.fullName !== undefined) updates.full_name = input.fullName;
  if (input.organization !== undefined) updates.organization = input.organization;
  if (input.role !== undefined) updates.role = input.role;
  if (input.branchId !== undefined) updates.branch_id = input.branchId;
  if (input.account !== undefined) updates.account = input.account;
  if (input.status !== undefined) updates.status = input.status;
  if (input.accountLocked !== undefined) updates.account_locked = input.accountLocked;
  if (input.forcePasswordChange !== undefined) updates.force_password_change = input.forcePasswordChange;

  const { data, error } = await supabase.from("profiles").update(updates).eq("id", id).select().maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const user = mapRowToUser(data, "");

  await recordAuditEvent({
    actorUserId: input.lastUpdatedBy,
    action: "USER_UPDATED",
    entityType: "USER",
    entityId: user.id,
    branchId: user.branchId,
    details: `Updated user ${user.username}.`,
  });

  return user;
}

export async function setUserLocked(id: string, accountLocked: boolean, lastUpdatedBy: string): Promise<User | null> {
  return updateUser(id, { accountLocked, lastUpdatedBy });
}
