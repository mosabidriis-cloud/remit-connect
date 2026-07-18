import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import BranchStatusTable from "../../components/dashboard/BranchStatusTable";
import Card from "../../components/ui/Card";
import { branches, getDashboardLiquiditySummary } from "../../services/branchService";
import { getFundingDashboardMetrics } from "../../services/fundingRequestService";

export default function Dashboard() {
  const liquiditySummary = getDashboardLiquiditySummary();
  const fundingMetrics = getFundingDashboardMetrics();
  const totalFilesReady = branches.reduce((sum, branch) => sum + branch.filesReady, 0);

  return (
    <MainLayout>
      <PageContainer title="Operations Controller Dashboard">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <Card title="Files Ready">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {totalFilesReady}
            </div>
          </Card>

          <Card title="Available Liquidity">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {liquiditySummary.totalAvailableLiquidity.toLocaleString()} SDG
            </div>
          </Card>

          <Card title="Liquidity Alerts">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {liquiditySummary.branchesBelowThreshold} Branches
            </div>
          </Card>

          <Card title="Critical Branches">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {liquiditySummary.criticalBranches} Branches
            </div>
          </Card>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "30px",
          }}
        >
          <Card title="Total Requested Today">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {fundingMetrics.totalRequestedToday.toLocaleString()} SDG
            </div>
          </Card>

          <Card title="Total Sent Today">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {fundingMetrics.totalSentToday.toLocaleString()} SDG
            </div>
          </Card>

          <Card title="Outstanding Requests">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {fundingMetrics.outstandingRequests}
            </div>
          </Card>

          <Card title="Funding Fulfillment Rate (%)">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {fundingMetrics.fulfillmentRate}%
            </div>
          </Card>
        </div>

        <BranchStatusTable />
      </PageContainer>
    </MainLayout>
  );
}