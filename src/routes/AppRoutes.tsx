import { Routes, Route, Navigate, useParams } from "react-router-dom";

const DEV_AUTH_KEY = "reos-auth";

import LoginPage from "../pages/auth/LoginPage";
import Dashboard from "../pages/controller/Dashboard";
import BranchListPage from "../pages/branches/BranchListPage";
import BranchDetailsPage from "../pages/branches/BranchDetailsPage";
import TreasuryPage from "../pages/treasury/TreasuryPage";
import FundingRequestPage from "../pages/funding/FundingRequestPage";
import SharedBatchListPage from "../pages/shared-batches/SharedBatchListPage";
import SharedBatchDetailsPage from "../pages/shared-batches/SharedBatchDetailsPage";
import CreditAccountWorkspacePage from "../pages/credit-account/CreditAccountWorkspacePage";
import CreditAccountBatchViewPage from "../pages/credit-account/CreditAccountBatchViewPage";
import { ReosLayout } from "../features/reos/layouts/ReosLayout";
import { ProofDownloadPage } from "../features/reos/pages/ProofDownloadPage";
import { UserCreatePage } from "../features/reos/pages/UserCreatePage";
import { UserDetailsPage } from "../features/reos/pages/UserDetailsPage";
import { UserEditPage } from "../features/reos/pages/UserEditPage";
import { UserListPage } from "../features/reos/pages/UserListPage";
import { OperationsDashboardPage } from "../features/reos/pages/OperationsDashboardPage";

function LegacyBranchRedirect() {
  const { branchId } = useParams();

  return <Navigate to={`/branch-liquidity/${branchId}`} replace />;
}

function ProtectedReosRoute({ children }: { children: React.ReactNode }) {
  if (localStorage.getItem(DEV_AUTH_KEY) === "true") {
    return <>{children}</>;
  }

  return <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/operations-command" element={<Dashboard />} />
      <Route path="/shared-batches" element={<SharedBatchListPage />} />
      <Route path="/shared-batches/:batchId" element={<SharedBatchDetailsPage />} />
      <Route path="/credit-account" element={<CreditAccountWorkspacePage />} />
      <Route
        path="/credit-account/batches/:batchId"
        element={<CreditAccountBatchViewPage />}
      />
      <Route
        path="/reos"
        element={
          <ProtectedReosRoute>
            <Navigate to="/reos/dashboard" replace />
          </ProtectedReosRoute>
        }
      />
      <Route
        path="/reos/dashboard"
        element={
          <ProtectedReosRoute>
            <ReosLayout>
              <OperationsDashboardPage />
            </ReosLayout>
          </ProtectedReosRoute>
        }
      />
      <Route
        path="/reos/shared-batches/:batchId/proof-download"
        element={
          <ProtectedReosRoute>
            <ReosLayout>
              <ProofDownloadPage />
            </ReosLayout>
          </ProtectedReosRoute>
        }
      />
      <Route
        path="/reos/administration/users"
        element={
          <ProtectedReosRoute>
            <ReosLayout>
              <UserListPage />
            </ReosLayout>
          </ProtectedReosRoute>
        }
      />
      <Route
        path="/reos/administration/users/create"
        element={
          <ProtectedReosRoute>
            <ReosLayout>
              <UserCreatePage />
            </ReosLayout>
          </ProtectedReosRoute>
        }
      />
      <Route
        path="/reos/administration/users/:userId"
        element={
          <ProtectedReosRoute>
            <ReosLayout>
              <UserDetailsPage />
            </ReosLayout>
          </ProtectedReosRoute>
        }
      />
      <Route
        path="/reos/administration/users/:userId/edit"
        element={
          <ProtectedReosRoute>
            <ReosLayout>
              <UserEditPage />
            </ReosLayout>
          </ProtectedReosRoute>
        }
      />

      <Route path="/branch-liquidity" element={<BranchListPage />} />
      <Route path="/branch-liquidity/:branchId" element={<BranchDetailsPage />} />
      <Route path="/treasury-decisions" element={<TreasuryPage />} />
      <Route path="/funding-execution" element={<FundingRequestPage />} />

      <Route
        path="/controller/dashboard"
        element={<Navigate to="/operations-command" replace />}
      />
      <Route path="/branches" element={<Navigate to="/branch-liquidity" replace />} />
      <Route path="/branches/:branchId" element={<LegacyBranchRedirect />} />
      <Route path="/treasury" element={<Navigate to="/treasury-decisions" replace />} />
      <Route
        path="/funding-requests"
        element={<Navigate to="/funding-execution" replace />}
      />

      <Route path="*" element={<h1>404 - Page Not Found</h1>} />
    </Routes>
  );
}
