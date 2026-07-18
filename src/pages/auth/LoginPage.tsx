import { useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TextInput from "../../components/forms/TextInput";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    console.log({
      username,
      password,
    });
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
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="Enter username"
          />

          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter password"
          />

          <div
            style={{
              marginTop: 10,
            }}
          >
            <Button onClick={handleLogin}>
              Sign In
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