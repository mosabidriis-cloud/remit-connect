import { useMemo, useState } from "react";

import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import {
  approveTreasuryRequest,
  getFundingHistory,
  getTreasuryRequests,
  getTreasurySummary,
  rejectTreasuryRequest,
} from "../../services/treasuryService";
import type { FundingHistoryEntry } from "../../types/Treasury";

export default function TreasuryPage() {
  const [requests, setRequests] = useState(getTreasuryRequests());
  const [history, setHistory] = useState(getFundingHistory());

  const summary = useMemo(() => getTreasurySummary(), []);

  function handleApprove(requestId: number) {
    const updated = approveTreasuryRequest(requestId);
    if (updated) {
      setRequests(getTreasuryRequests());
      setHistory(getFundingHistory());
    }
  }

  function handleReject(requestId: number) {
    const updated = rejectTreasuryRequest(requestId);
    if (updated) {
      setRequests(getTreasuryRequests());
      setHistory(getFundingHistory());
    }
  }

  return (
    <MainLayout>
      <PageContainer title="Treasury Foundation">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
            marginBottom: 24,
          }}
        >
          <Card title="Pending Requests">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {summary.pendingRequests}
            </div>
          </Card>

          <Card title="Approved Requests">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {summary.approvedRequests}
            </div>
          </Card>

          <Card title="Rejected Requests">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {summary.rejectedRequests}
            </div>
          </Card>

          <Card title="Total Requested">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {summary.totalRequestedAmount.toLocaleString()} SDG
            </div>
          </Card>
        </div>

        <Card title="Funding Requests">
          <div style={{ display: "grid", gap: 12 }}>
            {requests.map((request) => (
              <div
                key={request.id}
                style={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  padding: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#123A73" }}>{request.branchName}</div>
                  <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                    {request.reason}
                  </div>
                  <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                    {request.requestedAmount.toLocaleString()} {request.currency} • {request.requestedAt}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span
                    style={{
                      background:
                        request.status === "Approved"
                          ? "#16A34A"
                          : request.status === "Rejected"
                          ? "#DC2626"
                          : "#F59E0B",
                      color: "#FFFFFF",
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {request.status}
                  </span>

                  {request.status === "Pending" && (
                    <>
                      <Button onClick={() => handleApprove(request.id)}>Approve</Button>
                      <Button onClick={() => handleReject(request.id)} variant="danger">
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ marginTop: 24 }}>
          <Card title="Funding History">
            <DataTable<FundingHistoryEntry>
              data={history}
              columns={[
                {
                  header: "Branch",
                  render: (entry) => entry.branchName,
                },
                {
                  header: "Amount",
                  render: (entry) => `${entry.amount.toLocaleString()} ${entry.currency}`,
                },
                {
                  header: "Status",
                  render: (entry) => entry.status,
                },
                {
                  header: "Reference",
                  render: (entry) => entry.reference,
                },
                {
                  header: "Executed",
                  render: (entry) => entry.executedAt,
                },
              ]}
            />
          </Card>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
