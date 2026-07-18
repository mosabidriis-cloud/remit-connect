import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useParams, Link } from "react-router-dom";
import { branches } from "../../services/branchService";

export default function BranchDetailsPage() {
  const { branchId } = useParams();
  const branch = branches.find((item) => item.id === Number(branchId));

  if (!branch) {
    return (
      <MainLayout>
        <PageContainer title="Branch Details">
          <Card>
            <p>Branch not found.</p>
            <Link to="/branches" style={{ color: "#1E5AA8", fontWeight: 600 }}>
              Back to branches
            </Link>
          </Card>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer title={`${branch.name} Details`}>
        <div style={{ display: "grid", gap: 24 }}>
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

          <Card title="Operational Status">
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

          <Card title="Liquidity">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>USD Balance</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.usdBalance.toLocaleString()} USD
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>SDG Balance</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.sdgBalance.toLocaleString()} SDG
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Liquidity Limit</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {branch.liquidityLimit.toLocaleString()} SDG
                </div>
              </div>
            </div>
          </Card>

          <Card title="Supported Services">
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
                  {service}
                </span>
              ))}
            </div>
          </Card>

          <Card title="Recent Activity">
            <p style={{ margin: 0, color: "#64748B" }}>
              No recent activity recorded yet.
            </p>
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link to="/branches" style={{ textDecoration: "none" }}>
            <Button>Back to Branch List</Button>
          </Link>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
