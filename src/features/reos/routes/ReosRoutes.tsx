import type { RouteObject } from "react-router-dom";
import { ReosLayout } from "../layouts/ReosLayout";
import { BranchAssignmentPage } from "../pages/BranchAssignmentPage";
import { BranchProcessingPage } from "../pages/BranchProcessingPage";
import { ProofDownloadPage } from "../pages/ProofDownloadPage";
import { SharedBatchUploadPage } from "../pages/SharedBatchUploadPage";
import { TransactionProcessingPage } from "../pages/TransactionProcessingPage";
import { UserCreatePage } from "../pages/UserCreatePage";
import { UserDetailsPage } from "../pages/UserDetailsPage";
import { UserEditPage } from "../pages/UserEditPage";
import { UserListPage } from "../pages/UserListPage";

export const reosRoutes: RouteObject[] = [
  {
    path: "reos/branches/:branchId/processing",
    element: (
      <ReosLayout>
        <BranchProcessingPage />
      </ReosLayout>
    ),
  },
  {
    path: "reos/branches/:branchId/processing/:batchId/transactions/:transactionId",
    element: (
      <ReosLayout>
        <TransactionProcessingPage />
      </ReosLayout>
    ),
  },
  {
    path: "reos/shared-batches/:batchId/proof-download",
    element: (
      <ReosLayout>
        <ProofDownloadPage />
      </ReosLayout>
    ),
  },
  {
    path: "reos/shared-batches/assignment",
    element: (
      <ReosLayout>
        <BranchAssignmentPage />
      </ReosLayout>
    ),
  },
  {
    path: "reos/shared-batches/upload",
    element: (
      <ReosLayout>
        <SharedBatchUploadPage />
      </ReosLayout>
    ),
  },
  {
    path: "reos/administration/users",
    element: (
      <ReosLayout>
        <UserListPage />
      </ReosLayout>
    ),
  },
  {
    path: "reos/administration/users/create",
    element: (
      <ReosLayout>
        <UserCreatePage />
      </ReosLayout>
    ),
  },
  {
    path: "reos/administration/users/:userId",
    element: (
      <ReosLayout>
        <UserDetailsPage />
      </ReosLayout>
    ),
  },
  {
    path: "reos/administration/users/:userId/edit",
    element: (
      <ReosLayout>
        <UserEditPage />
      </ReosLayout>
    ),
  },
];
