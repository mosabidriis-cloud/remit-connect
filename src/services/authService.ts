// src/services/authService.ts
import { supabase } from '../lib/supabase';
import type { AuthUser, Session, LoginCredentials, Role } from '../auth/types';

/**
 * Signs in a user using username/password.
 * The username is treated as the email address in Supabase.
 */
export async function login(credentials: LoginCredentials): Promise<{ user: AuthUser; session: Session }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.username,
    password: credentials.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user || !data.session) {
    throw new Error('Login failed – no user or session returned');
  }

  // Extract role from user metadata; fallback to null if missing
  const role = (data.user.user_metadata?.role as Role) ?? null;

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email ?? '',
    role,
  };

  const session: Session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user,
  };

  return { user, session };
}

/**
 * Signs out the current user and clears the session.
 */
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Returns the current session if one exists.
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    return null;
  }

  // Build AuthUser from session user
  const user: AuthUser = {
    id: data.session.user.id,
    email: data.session.user.email ?? '',
    role: (data.session.user.user_metadata?.role as Role) ?? null,
  };

  const session: Session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user,
  };

  return session;
}

/**
 * Returns the currently authenticated user, or null if not signed in.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    return null;
  }

  const role = (data.user.user_metadata?.role as Role) ?? null;

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    role,
  };
}

/**
 * Subscribes to authentication state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      // Re‑hydrate the session shape expected by the rest of the app
      const user: AuthUser = {
        id: session.user.id,
        email: session.user.email ?? '',
        role: (session.user.user_metadata?.role as Role) ?? null,
      };
      const adaptedSession: Session = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user,
      };
      callback(event, adaptedSession);
    } else {
      callback(event, null);
    }
  });
}
