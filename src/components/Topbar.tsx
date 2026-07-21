export default function Topbar() {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header
      style={{
        height: 72,
        background: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 30px",
        boxSizing: "border-box",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            color: "#123A73",
            fontSize: "24px",
            fontWeight: 700,
          }}
        >
          REOS Operations
        </h2>

        <div
          style={{
            color: "#6B7280",
            fontSize: "14px",
            marginTop: 4,
          }}
        >
          Liquidity and funding control
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: "#1F2937",
            }}
          >
            {today}
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#6B7280",
            }}
          >
            System Online
          </div>
        </div>

        <div
          style={{
            fontSize: 0,
            fontWeight: 700,
            color: "#1E5AA8",
          }}
        >
          <span style={{ fontSize: 14 }}>Alerts</span>
          🔔
        </div>

        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#1E5AA8",
            color: "#FFFFFF",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: 700,
            fontSize: "18px",
          }}
        >
          M
        </div>

        <div>
          <div
            style={{
              fontWeight: 600,
              color: "#1F2937",
            }}
          >
            Mosab Adris
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#6B7280",
            }}
          >
            Operations Controller
          </div>
        </div>
      </div>
    </header>
  );
}
