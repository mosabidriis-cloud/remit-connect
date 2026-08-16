import { useEffect, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { getSession, logout, onAuthStateChange } from "../services/reosAuthService";
import type { ReosSession } from "../types/session";
import { ReosAuthContext } from "./reosAuthContext";

/**
 * Wraps the `/reos/*` route tree once (AUTHENTICATION.md Section 5). Holds the real
 * session, replacing the `localStorage.getItem("reos-auth")` flag every route used to
 * check independently.
 */
export function ReosAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ReosSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((result) => {
        if (!cancelled) {
          setSession(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    const unsubscribe = onAuthStateChange((result) => {
      if (!cancelled) {
        setSession(result);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await logout();
    setSession(null);
  };

  // Supabase's own auth-state-change event does not fire for a `profiles` row update
  // (e.g. clear_force_password_change) - only for actual session/token changes. Callers
  // that mutate the profile out from under the cached session (password change) must
  // explicitly refresh it, or ReosSessionGate keeps redirecting on stale data.
  const refresh = async () => {
    const result = await getSession();
    setSession(result);
  };

  return <ReosAuthContext.Provider value={{ session, loading, signOut, refresh }}>{children}</ReosAuthContext.Provider>;
}

/** One provider instance for the whole `/reos` route subtree, not one per route. */
export function ReosAuthProviderOutlet() {
  return (
    <ReosAuthProvider>
      <Outlet />
    </ReosAuthProvider>
  );
}
