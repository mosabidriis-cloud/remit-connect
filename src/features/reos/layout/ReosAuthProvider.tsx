import { useEffect, useState, type ReactNode } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { getSession, logout, onAuthStateChange } from "../services/reosAuthService";
import type { ReosSession } from "../types/session";
import { ReosAuthContext } from "./reosAuthContext";

/** 15 minutes, per the security requirement - auto-signout on inactivity. */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Wraps the `/reos/*` route tree once (AUTHENTICATION.md Section 5). Holds the real
 * session, replacing the `localStorage.getItem("reos-auth")` flag every route used to
 * check independently.
 */
export function ReosAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ReosSession | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  // Auto-signout after 15 minutes of no mouse/keyboard/scroll/touch activity - a real
  // security requirement, not just a UX nicety, for a portal handling payout data.
  // Only tracked while a session exists; the timer is torn down and restarted whenever
  // `session` changes identity (sign-in/sign-out), not on every activity event.
  useEffect(() => {
    if (!session) {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleIdleTimeout = () => {
      void signOut().then(() => navigate("/login", { replace: true }));
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signOut/navigate are stable for this component's lifetime; re-running per session identity change is the intended behavior.
  }, [session]);

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
