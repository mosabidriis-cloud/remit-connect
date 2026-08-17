import { supabase } from "../../../lib/supabase";
import type { ReosSession } from "../types/session";
import type { ReosUserRole, ReosUserStatus } from "../types/user";

/**
 * REOS's own Supabase Auth integration (AUTHENTICATION.md Section 5) - distinct from
 * `src/services/authService.ts`, which maps to a different, legacy role vocabulary and
 * sources role from user-editable `user_metadata` (see AUTHENTICATION.md Section 1 for
 * why that isn't reused). This is the one place REOS calls `supabase.auth.*` directly.
 */

async function loadSessionFromSupabaseUser(userId: string, email: string): Promise<ReosSession | null> {
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error || !profile) {
    return null;
  }

  return {
    userId: profile.id,
    email,
    employeeId: profile.employee_id,
    username: profile.username,
    fullName: profile.full_name,
    role: profile.role as ReosUserRole,
    branchId: profile.branch_id,
    status: profile.status as ReosUserStatus,
    accountLocked: profile.account_locked,
    forcePasswordChange: profile.force_password_change,
  };
}

/**
 * REOS is an internal, username-based portal - staff sign in with their operational
 * username (profiles.username), not an email address. Supabase Auth's password grant
 * only accepts email/phone, so the `login-with-username` Edge Function resolves the
 * username to its real email and performs the actual sign-in server-side (the same
 * "client can't safely do X" reasoning as `admin-create-user`, AUTHENTICATION.md
 * Section 4) - this function only ever sees the resulting session tokens, never the
 * email itself.
 */
export async function login(username: string, password: string): Promise<ReosSession> {
  const { data: tokens, error: invokeError } = await supabase.functions.invoke<{
    access_token: string;
    refresh_token: string;
  }>("login-with-username", {
    body: { username, password },
  });

  if (invokeError || !tokens?.access_token || !tokens?.refresh_token) {
    throw new Error(invokeError?.message ?? "Invalid username or password.");
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Sign-in failed.");
  }

  const session = await loadSessionFromSupabaseUser(data.user.id, data.user.email ?? "");

  if (!session) {
    throw new Error("Signed in, but no REOS profile exists for this account. Contact an Operations Manager.");
  }

  if (session.status === "INACTIVE" || session.accountLocked) {
    await supabase.auth.signOut();
    throw new Error("This account is inactive or locked. Contact an Operations Manager.");
  }

  // Best-effort - never blocks login if it fails.
  void supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", session.userId);

  return session;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<ReosSession | null> {
  const { data } = await supabase.auth.getSession();

  if (!data.session?.user) {
    return null;
  }

  return loadSessionFromSupabaseUser(data.session.user.id, data.session.user.email ?? "");
}

export function onAuthStateChange(callback: (session: ReosSession | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, authSession) => {
    if (!authSession?.user) {
      callback(null);
      return;
    }

    void loadSessionFromSupabaseUser(authSession.user.id, authSession.user.email ?? "").then(callback);
  });

  return () => subscription.unsubscribe();
}

/** Where a session should land after login/password-change - the first route their role can actually reach (AUTHENTICATION.md Section 6). */
export function getDefaultLandingPath(session: ReosSession): string {
  if (session.role === "OPERATIONS_MANAGER") {
    return "/reos/dashboard";
  }

  if (session.role === "DIRECT_REMIT_OFFICER") {
    return "/reos/shared-batches/upload";
  }

  return session.branchId ? `/reos/branches/${session.branchId}/processing` : "/reos/dashboard";
}

/** Sets a new password and clears the mandatory first-login change flag (Section 5). */
export async function changePassword(newPassword: string): Promise<void> {
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: rpcError } = await supabase.rpc("clear_force_password_change");

  if (rpcError) {
    throw new Error(rpcError.message);
  }
}
