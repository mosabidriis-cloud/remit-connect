import DataTable from "../ui/DataTable";
import { branches } from "../../services/branchService";
import type { Branch } from "../../types/Branch";

export default function BranchStatusTable() {
  const activeBranches = branches.filter((branch) => branch.active);

  return (
    <DataTable<Branch>
      data={activeBranches}
      columns={[
        {
          header: "Branch",
          render: (branch) => branch.name,
        },
        {
          header: "Liquidity",
          render: (branch) =>
            `${branch.liquidity.toLocaleString()} SDG`,
        },
        {
          header: "Available Accounts",
          render: (branch) =>
            branch.availableAccounts.toFixed(2),
        },
        {
          header: "Files Ready",
          render: (branch) => branch.filesReady,
        },
        {
          header: "Status",
          render: (branch) => (
            <span
              style={{
                background:
                  branch.status === "Ready"
                    ? "#16A34A"
                    : branch.status === "Funding Soon"
                    ? "#F59E0B"
                    : "#DC2626",
                color: "#FFFFFF",
                padding: "6px 12px",
                borderRadius: 20,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {branch.status}
            </span>
          ),
        },
        {
          header: "Updated",
          render: (branch) => branch.lastUpdated,
        },
      ]}
    />
  );
}