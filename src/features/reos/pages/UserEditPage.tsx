import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserForm, type UserFormValues } from "../components/UserForm";
import { getUserById, updateUser } from "../services/userService";
import type { User } from "../types/user";

export function UserEditPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (userId) {
      void getUserById(userId).then(setUser);
    }
  }, [userId]);

  const handleSubmit = (values: UserFormValues) => {
    if (!userId) {
      return;
    }

    void updateUser(userId, {
      ...values,
      branchId: values.branchId || null,
      lastUpdatedBy: "REOS",
    }).then((updatedUser) => {
      if (updatedUser) {
        navigate("../" + updatedUser.id);
      }
    });
  };

  if (!user) {
    return (
      <section className="mx-auto grid w-full max-w-7xl gap-6">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-950">Edit User</h1>
          <p className="mt-1 text-sm text-slate-600">Update an internal REOS user account.</p>
        </header>
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          User not found.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-950">Edit User</h1>
        <p className="mt-1 text-sm text-slate-600">{user.fullName}</p>
      </header>
      <UserForm initialUser={user} submitLabel="Save User" onSubmit={handleSubmit} />
    </section>
  );
}
