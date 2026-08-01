import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">User Management</h1>
          <p className="mt-1 text-sm text-slate-600">Manage internal REOS users.</p>
        </div>
        <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="button" onClick={() => navigate("create")}>
          Create User
        </button>
      </header>
      <UserTable users={users} onEditUser={(userId) => navigate(userId + "/edit")} onViewUser={(userId) => navigate(userId)} />
    </section>
  );
}
