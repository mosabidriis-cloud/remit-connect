import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import TextInput from "../../../components/forms/TextInput";
import { useReosSession } from "../layout/reosAuthContext";
import { changePassword, getDefaultLandingPath } from "../services/reosAuthService";

/**
 * Mandatory first-login password change (AUTHENTICATION.md Section 5). Reached
 * automatically by `ProtectedReosRoute` whenever the session's `forcePasswordChange`
 * flag is set - not a page a user can simply skip past by navigating elsewhere.
 */
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { session, refresh } = useReosSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await changePassword(newPassword);
      await refresh();
      navigate(session ? getDefaultLandingPath(session) : "/reos/dashboard", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to change password.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ alignItems: "center", background: "#F5F7FA", display: "flex", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: 420 }}>
        <Card>
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <h1 style={{ color: "#1E5AA8", margin: 0 }}>Set a New Password</h1>
            <p style={{ color: "#64748B", marginTop: 8 }}>
              {session ? `Welcome, ${session.fullName}. ` : ""}
              This account requires a new password before continuing.
            </p>
          </div>

          <TextInput label="New Password" onChange={setNewPassword} placeholder="At least 8 characters" type="password" value={newPassword} />
          <TextInput label="Confirm Password" onChange={setConfirmPassword} placeholder="Re-enter new password" type="password" value={confirmPassword} />

          {error ? <p style={{ color: "#DC2626", fontSize: 13, marginTop: 8 }}>{error}</p> : null}

          <div style={{ marginTop: 10 }}>
            <Button disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? "Saving..." : "Save and Continue"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
