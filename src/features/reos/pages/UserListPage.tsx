import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { UserTable } from "../components/UserTable";
import { listUsers } from "../services/userService";
import type { User } from "../types/user";

export function UserListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    void listUsers().then(setUsers);
  }, []);

  return (
    <PageContainer>
      <PageHeader
        actions={
          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="button" onClick={() => navigate("/reos/administration/users/create")}>
            Create User
          </button>
        }
        description="Manage internal REOS users."
        title="User Management"
      />
      <UserTable
        users={users}
        onEditUser={(userId) => navigate(`/reos/administration/users/${userId}/edit`)}
        onViewUser={(userId) => navigate(`/reos/administration/users/${userId}`)}
      />
    </PageContainer>
  );
}
