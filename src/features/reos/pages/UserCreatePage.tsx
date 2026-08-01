import { useNavigate } from "react-router-dom";
import { UserForm, type UserFormValues } from "../components/UserForm";
import { createUser } from "../services/userService";

export function UserCreatePage() {
  const navigate = useNavigate();

  const handleSubmit = (values: UserFormValues) => {
    void createUser({
      ...values,
      branchId: values.branchId || null,
      createdBy: "REOS",
      lastUpdatedBy: "REOS",
    }).then((user) => navigate("../" + user.id));
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-950">Create User</h1>
        <p className="mt-1 text-sm text-slate-600">Create an internal REOS user account.</p>
      </header>
      <UserForm submitLabel="Create User" onSubmit={handleSubmit} />
    </section>
  );
}
