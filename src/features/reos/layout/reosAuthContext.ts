import { createContext, useContext } from "react";
import type { ReosSession } from "../types/session";

export type ReosAuthContextValue = {
  session: ReosSession | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** Re-fetches the session/profile - needed after any change that mutates the profile without changing the auth session itself (e.g. clearing forcePasswordChange). */
  refresh: () => Promise<void>;
};

export const ReosAuthContext = createContext<ReosAuthContextValue | null>(null);

export function useReosSession(): ReosAuthContextValue {
  const context = useContext(ReosAuthContext);

  if (!context) {
    throw new Error("useReosSession must be used within a ReosAuthProvider");
  }

  return context;
}
