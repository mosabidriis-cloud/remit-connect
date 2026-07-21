import { useMemo, useState } from "react";

import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import {
  advanceFundingRequest,
  cancelFundingRequest,
  getBranchPrioritySnapshot,
  getFundingHistory,
  getFundingRequestSummary,
  getFundingRequests,
} from "../../services/fundingRequestService";
import type { FundingHistoryEntry, FundingRequest } from "../../types/FundingRequest";

export default function FundingRequestPage() {
  const [requests, setRequests] = useState(getFundingRequests());
  const [history, setHistory] = useState(getFundingHistory());
  const summary = useMemo(() => getFundingRequestSummary(), [requests]);

  function refreshState() {
    setRequests(getFundingRequests());
    setHistory(getFundingHistory());
  }

  function handleAdvance(requestId: number, nextStatus: "Sent" | "Received" | "Available") {
    advanceFundingRequest(requestId, nextStatus);
    refreshState();
  }

  function handleCancel(requestId: number) {
    cancelFundingRequest(requestId);
    refreshState();
  }

  return (
    <MainLayout>
      <PageContainer title="Funding Execution">
        <Card title="Execution Decision">
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
            Advance each funding request only when the prior cash movement is confirmed.
            Cancel requests that should not continue in the current funding run.
          </p>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 20,
            marginBottom: 24,
            marginTop: 24,
          }}
        >
          <Card title="Pending Requests">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {summary.pendingRequests}
            </div>
          </Card>

          <Card title="Available to Branches">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {summary.availableRequests}
            </div>
          </Card>

          <Card title="Total Funded SDG">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {summary.totalFundedAmount.toLocaleString()} SDG
            </div>
          </Card>

          <Card title="Excess SDG Branches">
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1E3A5F" }}>
              {summary.branchesWithExcessSdg}
            </div>
          </Card>
        </div>

        <Card title="Funding Execution Queue">
          <DataTable<FundingRequest>
            data={requests}
            columns={[
              {
                header: "Branch",
                render: (request) => request.branchName,
              },
              {
                header: "Requested Amount",
                render: (request) => `${request.requestedAmount.toLocaleString()} ${request.currency}`,
              },
              {
                header: "Sent Amount",
                render: (request) => `${request.sentAmount.toLocaleString()} ${request.currency}`,
              },
              {
                header: "Received Amount",
                render: (request) => `${request.receivedAmount.toLocaleString()} ${request.currency}`,
              },
              {
                header: "Available Amount",
                render: (request) => `${request.availableAmount.toLocaleString()} ${request.currency}`,
              },
              {
                header: "Variance",
                render: (request) => `${request.variance.toLocaleString()} ${request.currency}`,
              },
              {
                header: "Status",
                render: (request) => request.status,
              },
              {
                header: "Execution Decision",
                render: (request) => {
                  const prioritySnapshot = getBranchPrioritySnapshot(request.branchId);

                  return (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span
                        style={{
                          background:
                            request.status === "Available"
                              ? "#16A34A"
                              : request.status === "Cancelled"
                              ? "#DC2626"
                              : request.status === "Sent"
                              ? "#F59E0B"
                              : "#64748B",
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
                        <Button onClick={() => handleAdvance(request.id, "Sent")}>Mark Sent</Button>
                      )}

                      {request.status === "Sent" && (
                        <Button onClick={() => handleAdvance(request.id, "Received")}>Mark Received</Button>
                      )}

                      {request.status === "Received" && (
                        <Button onClick={() => handleAdvance(request.id, "Available")}>Mark Available</Button>
                      )}

                      {request.status !== "Cancelled" && request.status !== "Available" && (
                        <Button onClick={() => handleCancel(request.id)} variant="danger">
                          Cancel
                        </Button>
                      )}

                      {prioritySnapshot.recommendedForOutwardAllocation && (
                        <span style={{ color: "#1E5AA8", fontSize: 13, fontWeight: 600 }}>
                          Use excess SDG first
                        </span>
                      )}
                    </div>
                  );
                },
              },
            ]}
          />
        </Card>

        <div style={{ marginTop: 24 }}>
          <Card title="Execution History">
            <DataTable<FundingHistoryEntry>
              data={history}
              columns={[
                {
                  header: "Branch",
                  render: (entry) => entry.branchName,
                },
                {
                  header: "Status",
                  render: (entry) => entry.status,
                },
                {
                  header: "Amount",
                  render: (entry) => `${entry.amount.toLocaleString()} ${entry.currency}`,
                },
                {
                  header: "Timestamp",
                  render: (entry) => entry.timestamp,
                },
                {
                  header: "Description",
                  render: (entry) => entry.description,
                },
              ]}
            />
          </Card>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
