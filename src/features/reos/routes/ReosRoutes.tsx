import type { RouteObject } from "react-router-dom";
import { ReosLayout } from "../layouts/ReosLayout";
import { UserCreatePage } from "../pages/UserCreatePage";
import { UserDetailsPage } from "../pages/UserDetailsPage";
import { UserEditPage } from "../pages/UserEditPage";
import { UserListPage } from "../pages/UserListPage";

export const reosRoutes: RouteObject[] = [
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
