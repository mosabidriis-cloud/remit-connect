import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import TextInput from "../../components/forms/TextInput";
import { filterBranches } from "../../services/branchService";
import type { Branch, BranchStatus } from "../../types/Branch";

const statusOptions: Array<BranchStatus | "All"> = [
  "All",
  "Ready",
  "Funding Soon",
  "Urgent Funding",
];

export default function BranchListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BranchStatus | "All">("All");

  const filteredBranches = useMemo(() => {
    return filterBranches(searchQuery, statusFilter);
  }, [searchQuery, statusFilter]);

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("All");
  }

  return (
    <MainLayout>
      <PageContainer title="Branch Management">
        <Card>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              alignItems: "end",
            }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              <TextInput
                label="Search branches"
                value={searchQuery}
                placeholder="Search by name, code, city, or manager"
                onChange={setSearchQuery}
              />
            </div>

            <div style={{ minWidth: 220 }}>
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  color: "#334155",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                Status Filter
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as BranchStatus | "All")
                }
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 14,
                  outline: "none",
                }}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <Button onClick={clearFilters}>Clear Filters</Button>
          </div>
        </Card>

        <div style={{ marginTop: 24 }}>
          <DataTable<Branch>
            data={filteredBranches}
            columns={[
              {
                header: "Branch",
                render: (branch) => (
                  <div>
                    <div style={{ fontWeight: 700, color: "#123A73" }}>
                      {branch.name}
                    </div>
                    <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                      {branch.code}
                    </div>
                  </div>
                ),
              },
              {
                header: "Manager",
                render: (branch) => branch.manager,
              },
              {
                header: "Location",
                render: (branch) => `${branch.city}, ${branch.state}`,
              },
              {
                header: "Liquidity",
                render: (branch) => `${branch.liquidity.toLocaleString()} SDG`,
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
                      display: "inline-block",
                    }}
                  >
                    {branch.status}
                  </span>
                ),
              },
              {
                header: "Action",
                render: (branch) => (
                  <Link
                    to={`/branches/${branch.id}`}
                    style={{
                      color: "#1E5AA8",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    View Details
                  </Link>
                ),
              },
            ]}
          />
        </div>
      </PageContainer>
    </MainLayout>
  );
}
