import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    {
      title: "Operations Command",
      path: "/operations-command",
      icon: "OC",
    },
    {
      title: "Shared Batches",
      path: "/shared-batches",
      icon: "SB",
    },
    {
      title: "Credit to Account",
      path: "/credit-account",
      icon: "CA",
    },
    {
      title: "Branch Liquidity",
      path: "/branch-liquidity",
      icon: "BL",
    },
    {
      title: "Treasury Decisions",
      path: "/treasury-decisions",
      icon: "TD",
    },
    {
      title: "Funding Execution",
      path: "/funding-execution",
      icon: "FE",
    },
  ];

  return (
    <aside
      style={{
        width: 270,
        background: "#123A73",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          marginBottom: 40,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          REMIT EXCHANGE
        </h2>

        <p
          style={{
            marginTop: 8,
            color: "#CBD5E1",
            fontSize: 14,
          }}
        >
          Operations Portal
        </p>
      </div>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {menuItems.map((item) => {
          const active = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 10,
                textDecoration: "none",
                color: "#FFFFFF",
                background: active
                  ? "rgba(255,255,255,0.15)"
                  : "transparent",
                fontWeight: active ? 700 : 500,
                transition: "0.2s",
              }}
            >
              <span>{item.icon}</span>
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 24,
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            fontWeight: 600,
          }}
        >
          Mosab Adris
        </div>

        <div
          style={{
            color: "#CBD5E1",
            fontSize: 13,
            marginTop: 4,
          }}
        >
          Operations Controller
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 12,
            color: "#94A3B8",
          }}
        >
          REOS v1.0
        </div>
      </div>
    </aside>
  );
}
