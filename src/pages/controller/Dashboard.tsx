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
      <PageContainer title="Operations Command Center">
        <Card title="Next Operational Decision">
          <div style={{ color: "#334155", lineHeight: 1.7 }}>
            {liquiditySummary.criticalBranches > 0
              ? `${liquiditySummary.criticalBranches} critical branches need immediate funding review before more files are assigned.`
              : fundingMetrics.outstandingRequests > 0
              ? `${fundingMetrics.outstandingRequests} funding requests are still open and should be advanced or cancelled.`
              : "All active branches can continue service while treasury monitors liquidity thresholds."}
          </div>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "30px",
            marginTop: "24px",
          }}
        >
          <Card title="Files Awaiting Branch Capacity">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {totalFilesReady}
            </div>
          </Card>

          <Card title="Total Available Liquidity">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {liquiditySummary.totalAvailableLiquidity.toLocaleString()} SDG
            </div>
          </Card>

          <Card title="Branches Below Threshold">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {liquiditySummary.branchesBelowThreshold} Branches
            </div>
          </Card>

          <Card title="Immediate Funding Decisions">
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
          <Card title="Requested Today">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {fundingMetrics.totalRequestedToday.toLocaleString()} SDG
            </div>
          </Card>

          <Card title="Sent Today">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {fundingMetrics.totalSentToday.toLocaleString()} SDG
            </div>
          </Card>

          <Card title="Open Funding Actions">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {fundingMetrics.outstandingRequests}
            </div>
          </Card>

          <Card title="Funding Fulfillment Rate">
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
