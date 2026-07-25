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
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Create User</h1>
        <p className="text-sm text-slate-600">Create an internal REOS user account.</p>
      </div>
      <UserForm submitLabel="Create User" onSubmit={handleSubmit} />
    </section>
  );
}
