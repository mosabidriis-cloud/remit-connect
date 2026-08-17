import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/auth/LoginPage";
import Dashboard from "../pages/controller/Dashboard";
import SharedBatchListPage from "../pages/shared-batches/SharedBatchListPage";
import SharedBatchDetailsPage from "../pages/shared-batches/SharedBatchDetailsPage";
import CreditAccountWorkspacePage from "../pages/credit-account/CreditAccountWorkspacePage";
import CreditAccountBatchViewPage from "../pages/credit-account/CreditAccountBatchViewPage";
import { ReosAuthProviderOutlet } from "../features/reos/layout/ReosAuthProvider";
import { BranchGate, ReosChangePasswordGate, ReosIndexRedirect, ReosSessionGate, RoleGate } from "../features/reos/layout/RouteGuards";
import { BranchAssignmentPage } from "../features/reos/pages/BranchAssignmentPage";
import { BranchProcessingPage } from "../features/reos/pages/BranchProcessingPage";
import { ChangePasswordPage } from "../features/reos/pages/ChangePasswordPage";
import { DataCoveragePage } from "../features/reos/pages/DataCoveragePage";
import { DuplicateManagementPage } from "../features/reos/pages/DuplicateManagementPage";
import { HistoricalPerformancePage } from "../features/reos/pages/HistoricalPerformancePage";
import { ImportBatchDetailPage } from "../features/reos/pages/ImportBatchDetailPage";
import { ImportHistoryPage } from "../features/reos/pages/ImportHistoryPage";
import { ImportIntelligencePage } from "../features/reos/pages/ImportIntelligencePage";
import { LiquidityDashboardPage } from "../features/reos/pages/LiquidityDashboardPage";
import { LiquidityManagementPage } from "../features/reos/pages/LiquidityManagementPage";
import { ProofDownloadPage } from "../features/reos/pages/ProofDownloadPage";
import { ReportsPage } from "../features/reos/pages/ReportsPage";
import { SharedBatchUploadPage } from "../features/reos/pages/SharedBatchUploadPage";
import { UserCreatePage } from "../features/reos/pages/UserCreatePage";
import { UserDetailsPage } from "../features/reos/pages/UserDetailsPage";
import { UserEditPage } from "../features/reos/pages/UserEditPage";
import { UserListPage } from "../features/reos/pages/UserListPage";
import { OperationsDashboardPage } from "../features/reos/pages/OperationsDashboardPage";

// Route -> role map, AUTHENTICATION.md Section 6.
const OM = ["OPERATIONS_MANAGER"] as const;
const DRO_OR_OM = ["DIRECT_REMIT_OFFICER", "OPERATIONS_MANAGER"] as const;

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

      {/* One ReosAuthProvider for the whole /reos subtree - not re-fetched per navigation. */}
      <Route element={<ReosAuthProviderOutlet />}>
        <Route
          path="/reos/change-password"
          element={
            <ReosChangePasswordGate>
              <ChangePasswordPage />
            </ReosChangePasswordGate>
          }
        />

        <Route path="/reos" element={<ReosSessionGate />}>
          <Route index element={<ReosIndexRedirect />} />

          <Route path="dashboard" element={<RoleGate roles={[...OM]}><OperationsDashboardPage /></RoleGate>} />
          <Route path="reports" element={<RoleGate roles={[...OM]}><ReportsPage /></RoleGate>} />

          <Route path="shared-batches/upload" element={<RoleGate roles={[...DRO_OR_OM]}><SharedBatchUploadPage /></RoleGate>} />
          <Route path="shared-batches/assignment" element={<RoleGate roles={[...DRO_OR_OM]}><BranchAssignmentPage /></RoleGate>} />
          <Route path="shared-batches/:batchId/proof-download" element={<RoleGate roles={[...DRO_OR_OM]}><ProofDownloadPage /></RoleGate>} />

          <Route path="import-intelligence" element={<RoleGate roles={[...DRO_OR_OM]}><ImportIntelligencePage /></RoleGate>} />
          <Route path="import-intelligence/coverage" element={<RoleGate roles={[...DRO_OR_OM]}><DataCoveragePage /></RoleGate>} />
          <Route path="import-intelligence/history" element={<RoleGate roles={[...DRO_OR_OM]}><ImportHistoryPage /></RoleGate>} />
          <Route path="import-intelligence/history/:batchId" element={<RoleGate roles={[...DRO_OR_OM]}><ImportBatchDetailPage /></RoleGate>} />
          <Route path="import-intelligence/duplicates" element={<RoleGate roles={[...DRO_OR_OM]}><DuplicateManagementPage /></RoleGate>} />
          <Route path="import-intelligence/performance" element={<RoleGate roles={[...DRO_OR_OM]}><HistoricalPerformancePage /></RoleGate>} />

          <Route path="liquidity" element={<RoleGate roles={[...OM]}><LiquidityManagementPage /></RoleGate>} />
          <Route path="liquidity/dashboard" element={<RoleGate roles={[...OM]}><LiquidityDashboardPage /></RoleGate>} />

          <Route path="branches/:branchId/processing" element={<BranchGate><BranchProcessingPage /></BranchGate>} />

          <Route path="administration/users" element={<RoleGate roles={[...OM]}><UserListPage /></RoleGate>} />
          <Route path="administration/users/create" element={<RoleGate roles={[...OM]}><UserCreatePage /></RoleGate>} />
          <Route path="administration/users/:userId" element={<RoleGate roles={[...OM]}><UserDetailsPage /></RoleGate>} />
          <Route path="administration/users/:userId/edit" element={<RoleGate roles={[...OM]}><UserEditPage /></RoleGate>} />
        </Route>
      </Route>

      <Route
        path="/controller/dashboard"
        element={<Navigate to="/operations-command" replace />}
      />

      <Route path="*" element={<h1>404 - Page Not Found</h1>} />
    </Routes>
  );
}
