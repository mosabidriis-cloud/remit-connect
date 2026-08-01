import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
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
    <PageContainer>
      <PageHeader
        description="Create an internal REOS user account."
        title="Create User"
      />
      <UserForm submitLabel="Create User" onSubmit={handleSubmit} />
    </PageContainer>
  );
}
