import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useParams, Link } from "react-router-dom";
import { getBranchById } from "../../services/branchService";

export default function BranchDetailsPage() {
  const { branchId } = useParams();
  const branch = getBranchById(Number(branchId));

  if (!branch) {
    return (
      <MainLayout>
        <PageContainer title="Branch Liquidity Review">
          <Card>
            <p>Branch not found.</p>
            <Link to="/branch-liquidity" style={{ color: "#1E5AA8", fontWeight: 600 }}>
              Back to branch liquidity
            </Link>
          </Card>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer title={`${branch.name} Liquidity Review`}>
        <div style={{ display: "grid", gap: 24 }}>
          <Card title="Recommended Decision">
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
              {branch.status === "Urgent Funding"
                ? "Approve immediate branch funding before assigning additional customer files."
                : branch.status === "Funding Soon"
                ? "Queue this branch for the next treasury funding run and keep monitoring threshold movement."
                : "Branch can continue serving customers. No immediate funding action is required."}
            </p>
          </Card>

          <Card title="Branch Information">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Branch Code</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.code}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Name</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.name}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Manager</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.manager}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Location</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.city}, {branch.state}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Phone</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.phone}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Email</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.email ?? "Not provided"}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Operational Control">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Status</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.status}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Last Updated</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.lastUpdated}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Active</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.active ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Liquidity Position">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Available Liquidity</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.liquidity.availableLiquidity.toLocaleString()} SDG
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>USD Balance</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.liquidity.usdBalance.toLocaleString()} USD
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>SDG Balance</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.liquidity.sdgBalance.toLocaleString()} SDG
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Liquidity Limit</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.liquidity.liquidityLimit.toLocaleString()} SDG
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Minimum Threshold</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.liquidity.minimumThreshold.toLocaleString()} SDG
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Liquidity Health</div>
                <div style={{ fontWeight: 700, color: "#123A5F", marginTop: 4 }}>
                  {branch.liquidity.health}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Alert Level</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.liquidity.alertLevel}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Operational Capabilities">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {branch.services.map((service) => (
                <span
                  key={service}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E5E7EB",
                    color: "#123A73",
                    padding: "8px 12px",
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  {service === "Account Funding" ? "Branch Liquidity Support" : service}
                </span>
              ))}
            </div>
          </Card>

          <Card title="Decision Notes">
            <p style={{ margin: 0, color: "#64748B" }}>
              Use this view to decide whether treasury should fund the branch now,
              queue it for the next run, or allow normal service to continue.
            </p>
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link to="/branch-liquidity" style={{ textDecoration: "none" }}>
            <Button>Back to Branch Liquidity</Button>
          </Link>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
