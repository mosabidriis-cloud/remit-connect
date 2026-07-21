import { Link } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";
import {
  getSharedBatchProgressSummary,
  getSharedBatches,
} from "../../services/sharedBatchService";
import type { SharedBatch, SharedBatchAssignmentStatus } from "../../types/SharedBatch";

function getBadgeColor(status: SharedBatchAssignmentStatus) {
  if (status === "Completed") {
    return "green";
  }

  if (status === "In Branch Review") {
    return "orange";
  }

  if (status === "Assigned") {
    return "blue";
  }

  return "gray";
}

export default function SharedBatchListPage() {
  const batches = getSharedBatches();
  const summary = getSharedBatchProgressSummary();

  return (
    <MainLayout>
      <PageContainer title="Shared Batches">
        <Card title="Batch Progress Summary">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
            }}
          >
            <div>
              <div style={{ color: "#64748B", fontSize: 13 }}>Total Batches</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                {summary.totalBatches}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748B", fontSize: 13 }}>Unassigned</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                {summary.unassignedBatches}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748B", fontSize: 13 }}>Assigned</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                {summary.assignedBatches}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748B", fontSize: 13 }}>In Branch Review</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                {summary.inBranchReviewBatches}
              </div>
            </div>
            <div>
              <div style={{ color: "#64748B", fontSize: 13 }}>Transactions</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                {summary.totalTransactions}
              </div>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: 24 }}>
          <Card title="Received Excel Batches">
            <DataTable<SharedBatch>
              data={batches}
              columns={[
                {
                  header: "Batch",
                  render: (batch) => (
                    <div>
                      <div style={{ fontWeight: 700, color: "#123A73" }}>
                        {batch.batchCode}
                      </div>
                      <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                        {batch.fileName}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Received",
                  render: (batch) => batch.receivedAt,
                },
                {
                  header: "Transactions",
                  render: (batch) => batch.transactionCount,
                },
                {
                  header: "Total Amount",
                  render: (batch) =>
                    `${batch.totalAmount.toLocaleString()} ${batch.currency}`,
                },
                {
                  header: "Assigned Branch",
                  render: (batch) => batch.assignedBranchName ?? "Not assigned",
                },
                {
                  header: "Status",
                  render: (batch) => (
                    <Badge
                      text={batch.assignmentStatus}
                      color={getBadgeColor(batch.assignmentStatus)}
                    />
                  ),
                },
                {
                  header: "Action",
                  render: (batch) => (
                    <Link
                      to={`/shared-batches/${batch.id}`}
                      style={{
                        color: "#1E5AA8",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      View details
                    </Link>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
