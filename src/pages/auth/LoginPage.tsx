import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TextInput from "../../components/forms/TextInput";
import { getDefaultLandingPath, login } from "../../features/reos/services/reosAuthService";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleLogin() {
    setError(null);
    setSubmitting(true);

    try {
      const session = await login(username, password);
      navigate(session.forcePasswordChange ? "/reos/change-password" : getDefaultLandingPath(session), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#F5F7FA",
      }}
    >
      <div
        style={{
          width: 420,
        }}
      >
        <Card>
          <div
            style={{
              textAlign: "center",
              marginBottom: 30,
            }}
          >
            <h1
              style={{
                margin: 0,
                color: "#1E5AA8",
              }}
            >
              REMIT EXCHANGE
            </h1>

            <p
              style={{
                color: "#64748B",
                marginTop: 8,
              }}
            >
              Operations Portal
            </p>
          </div>

          <TextInput
            autoComplete="off"
            label="Username"
            name="reos-username"
            value={username}
            onChange={setUsername}
            placeholder="Enter your username"
          />

          <TextInput
            autoComplete="new-password"
            label="Password"
            name="reos-password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter password"
          />

          {error ? <p style={{ color: "#DC2626", fontSize: 13, marginTop: 8 }}>{error}</p> : null}

          <div
            style={{
              marginTop: 10,
            }}
          >
            <Button disabled={submitting} onClick={() => void handleLogin()}>
              {submitting ? "Signing In..." : "Sign In"}
            </Button>
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: 24,
              color: "#94A3B8",
              fontSize: 13,
            }}
          >
            Powered by REOS v1.0
          </p>
        </Card>
      </div>
    </div>
  );
}
