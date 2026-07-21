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
          header: "Available Liquidity",
          render: (branch) =>
            `${branch.liquidity.availableLiquidity.toLocaleString()} SDG`,
        },
        {
          header: "Liquidity Health",
          render: (branch) => branch.liquidity.health,
        },
        {
          header: "Files Ready",
          render: (branch) => branch.filesReady,
        },
        {
          header: "Operating Decision",
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
              {branch.status === "Urgent Funding"
                ? "Fund now"
                : branch.status === "Funding Soon"
                ? "Queue funding"
                : "Keep serving"}
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
