import type { RouteObject } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { BranchAssignmentPage } from "../pages/BranchAssignmentPage";
import { BranchProcessingPage } from "../pages/BranchProcessingPage";
import { OperationsDashboardPage } from "../pages/OperationsDashboardPage";
import { ProofDownloadPage } from "../pages/ProofDownloadPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SharedBatchUploadPage } from "../pages/SharedBatchUploadPage";
import { TransactionProcessingPage } from "../pages/TransactionProcessingPage";
import { UserCreatePage } from "../pages/UserCreatePage";
import { UserDetailsPage } from "../pages/UserDetailsPage";
import { UserEditPage } from "../pages/UserEditPage";
import { UserListPage } from "../pages/UserListPage";

export const reosRoutes: RouteObject[] = [
  {
    path: "reos/dashboard",
    element: (
      <AppLayout>
        <OperationsDashboardPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/reports",
    element: (
      <AppLayout>
        <ReportsPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/branches/:branchId/processing",
    element: (
      <AppLayout>
        <BranchProcessingPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/branches/:branchId/processing/:batchId/transactions/:transactionId",
    element: (
      <AppLayout>
        <TransactionProcessingPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/shared-batches/:batchId/proof-download",
    element: (
      <AppLayout>
        <ProofDownloadPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/shared-batches/assignment",
    element: (
      <AppLayout>
        <BranchAssignmentPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/shared-batches/upload",
    element: (
      <AppLayout>
        <SharedBatchUploadPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/administration/users",
    element: (
      <AppLayout>
        <UserListPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/administration/users/create",
    element: (
      <AppLayout>
        <UserCreatePage />
      </AppLayout>
    ),
  },
  {
    path: "reos/administration/users/:userId",
    element: (
      <AppLayout>
        <UserDetailsPage />
      </AppLayout>
    ),
  },
  {
    path: "reos/administration/users/:userId/edit",
    element: (
      <AppLayout>
        <UserEditPage />
      </AppLayout>
    ),
  },
];
