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
    return <p className="text-sm text-slate-600">User not found.</p>;
  }

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Edit User</h1>
        <p className="text-sm text-slate-600">{user.fullName}</p>
      </div>
      <UserForm initialUser={user} submitLabel="Save User" onSubmit={handleSubmit} />
    </section>
  );
}
