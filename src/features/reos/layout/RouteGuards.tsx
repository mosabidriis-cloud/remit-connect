import type { ReactNode } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { ReosLayout } from "../layouts/ReosLayout";
import { getDefaultLandingPath } from "../services/reosAuthService";
import type { ReosUserRole } from "../types/user";
import { useReosSession } from "./reosAuthContext";

/**
 * Root gate for the entire `/reos/*` tree (AUTHENTICATION.md Section 5) - one
 * `ReosAuthProvider` instance for the whole session, not re-fetched on every
 * navigation. No session -> `/login`. `forcePasswordChange` -> the change-password
 * page, unskippable by direct navigation. `INACTIVE`/locked -> rejected here too, so a
 * deactivation takes effect immediately, not just at next sign-in.
 */
export function ReosSessionGate() {
  const { session, loading } = useReosSession();

  if (loading) {
    return (
      <div style={{ alignItems: "center", display: "flex", height: "100vh", justifyContent: "center" }}>
        <p style={{ color: "#64748B" }}>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.status === "INACTIVE" || session.accountLocked) {
    return <Navigate to="/login" replace />;
  }

  if (session.forcePasswordChange) {
    return <Navigate to="/reos/change-password" replace />;
  }

  return (
    <ReosLayout>
      <Outlet />
    </ReosLayout>
  );
}

/** `/reos` index - lands each role on the first page it can actually reach (AUTHENTICATION.md Section 6). */
export function ReosIndexRedirect() {
  const { session } = useReosSession();

  return <Navigate to={session ? getDefaultLandingPath(session) : "/reos/dashboard"} replace />;
}

/** The change-password route itself must render without the forcePasswordChange redirect looping. */
export function ReosChangePasswordGate({ children }: { children: ReactNode }) {
  const { session, loading } = useReosSession();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** Restricts a route to specific roles. Operations Manager is not implicitly included - list it explicitly where it should have access. */
export function RoleGate({ roles, children }: { roles: ReosUserRole[]; children: ReactNode }) {
  const { session } = useReosSession();

  if (!session || !roles.includes(session.role)) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#B91C1C", padding: 16 }}>
        You are not authorized to view this page.
      </div>
    );
  }

  return <>{children}</>;
}

/** Branch Processing/Transaction Processing: a Branch Officer may only reach their own branch; Operations Manager may reach any. */
export function BranchGate({ children }: { children: ReactNode }) {
  const { session } = useReosSession();
  const { branchId } = useParams<{ branchId: string }>();

  if (!session) {
    return null;
  }

  const authorized = session.role === "OPERATIONS_MANAGER" || (session.role === "BRANCH_OFFICER" && session.branchId === branchId);

  if (!authorized) {
    return (
      <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#B91C1C", padding: 16 }}>
        You are not authorized to view this branch.
      </div>
    );
  }

  return <>{children}</>;
}
