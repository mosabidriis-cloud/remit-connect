import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/common/EmptyState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { UserForm, type UserFormValues } from "../components/UserForm";
import { useReosSession } from "../layout/reosAuthContext";
import { getUserById, updateUser } from "../services/userService";
import type { User } from "../types/user";

export function UserEditPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { session } = useReosSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.resolve();

      if (!userId) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
      }

      const result = await getUserById(userId);

      if (!cancelled) {
        setUser(result);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSubmit = (values: UserFormValues) => {
    if (!userId || !session) {
      return;
    }

    setError(null);

    void updateUser(userId, {
      ...values,
      branchId: values.branchId || null,
      lastUpdatedBy: session.userId,
    })
      .then((updatedUser) => {
        if (updatedUser) {
          navigate(`/reos/administration/users/${updatedUser.id}`);
        }
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to update user."));
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          description="Update an internal REOS user account."
          title="Edit User"
        />
        <EmptyState message="Loading user..." />
      </PageContainer>
    );
  }

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
      {error ? (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#B91C1C", padding: 16 }}>{error}</div>
      ) : null}
      <UserForm initialUser={user} mode="edit" submitLabel="Save User" onSubmit={handleSubmit} />
    </PageContainer>
  );
}
