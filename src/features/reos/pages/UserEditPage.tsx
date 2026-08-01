import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/common/EmptyState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
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
      <PageContainer>
        <PageHeader
          description="Update an internal REOS user account."
          title="Edit User"
        />
        <EmptyState message="User not found." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        description={user.fullName}
        title="Edit User"
      />
      <UserForm initialUser={user} submitLabel="Save User" onSubmit={handleSubmit} />
    </PageContainer>
  );
}
