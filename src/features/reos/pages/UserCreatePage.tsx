import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { UserForm, type UserFormValues } from "../components/UserForm";
import { useReosSession } from "../layout/reosAuthContext";
import { createUser } from "../services/userService";

export function UserCreatePage() {
  const navigate = useNavigate();
  const { session } = useReosSession();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (values: UserFormValues) => {
    if (!session) {
      return;
    }

    setError(null);

    void createUser(
      {
        ...values,
        branchId: values.branchId || null,
      },
      session.userId,
    )
      .then((user) => navigate(`/reos/administration/users/${user.id}`))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to create user."));
  };

  return (
    <PageContainer>
      <PageHeader
        description="Create an internal REOS user account and provision its sign-in credential."
        title="Create User"
      />
      {error ? (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#B91C1C", padding: 16 }}>{error}</div>
      ) : null}
      <UserForm mode="create" submitLabel="Create User" onSubmit={handleSubmit} />
    </PageContainer>
  );
}
