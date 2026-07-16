function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "400px",
          background: "#FFFFFF",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#1E5AA8",
            marginBottom: "8px",
          }}
        >
          REMIT CONNECT
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#6B7280",
            marginBottom: "30px",
          }}
        >
          Operations Portal
        </p>

        <input
          type="text"
          placeholder="Username"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "15px",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxSizing: "border-box",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxSizing: "border-box",
          }}
        />

        <button
          style={{
            width: "100%",
            padding: "12px",
            background: "#1E5AA8",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Sign In
        </button>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#9CA3AF",
            fontSize: "14px",
          }}
        >
          Powered by REOS
        </p>
      </div>
    </div>
  );
}

export default LoginPage;