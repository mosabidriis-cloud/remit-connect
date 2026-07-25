import { Routes, Route, Navigate, useParams } from "react-router-dom";

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
import { UserCreatePage } from "../features/reos/pages/UserCreatePage";
import { UserDetailsPage } from "../features/reos/pages/UserDetailsPage";
import { UserEditPage } from "../features/reos/pages/UserEditPage";
import { UserListPage } from "../features/reos/pages/UserListPage";

function LegacyBranchRedirect() {
  const { branchId } = useParams();

  return <Navigate to={`/branch-liquidity/${branchId}`} replace />;
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
        element={<Navigate to="/reos/administration/users" replace />}
      />
      <Route
        path="/reos/administration/users"
        element={
          <ReosLayout>
            <UserListPage />
          </ReosLayout>
        }
      />
      <Route
        path="/reos/administration/users/create"
        element={
          <ReosLayout>
            <UserCreatePage />
          </ReosLayout>
        }
      />
      <Route
        path="/reos/administration/users/:userId"
        element={
          <ReosLayout>
            <UserDetailsPage />
          </ReosLayout>
        }
      />
      <Route
        path="/reos/administration/users/:userId/edit"
        element={
          <ReosLayout>
            <UserEditPage />
          </ReosLayout>
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
