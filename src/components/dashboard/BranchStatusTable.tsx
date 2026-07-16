import { branches } from "../../services/branchService";

export default function BranchStatusTable() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        marginTop: 30,
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 20,
          color: "#123A73",
        }}
      >
        Branch Status
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#F5F7FA",
            }}
          >
            <th style={header}>Branch</th>
            <th style={header}>Liquidity</th>
            <th style={header}>Available Accounts</th>
            <th style={header}>Files Ready</th>
            <th style={header}>Status</th>
            <th style={header}>Updated</th>
          </tr>
        </thead>

        <tbody>
          {branches
            .filter((branch) => branch.active)
            .map((branch) => (
              <tr key={branch.id}>
                <td style={cell}>{branch.name}</td>

                <td style={cell}>
                  {branch.liquidity.toLocaleString()} SDG
                </td>

                <td style={cell}>
                  {branch.availableAccounts.toFixed(2)}
                </td>

                <td style={cell}>{branch.filesReady}</td>

                <td style={cell}>
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      color: "#fff",
                      fontWeight: 600,
                      background:
                        branch.status === "Ready"
                          ? "#16A34A"
                          : branch.status === "Funding Soon"
                          ? "#F59E0B"
                          : "#DC2626",
                    }}
                  >
                    {branch.status}
                  </span>
                </td>

                <td style={cell}>{branch.lastUpdated}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

const header: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  borderBottom: "1px solid #E5E7EB",
};

const cell: React.CSSProperties = {
  padding: "14px",
  borderBottom: "1px solid #F1F5F9",
};