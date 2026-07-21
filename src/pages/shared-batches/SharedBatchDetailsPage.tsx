import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";
import { branches } from "../../services/branchService";
import {
  assignSharedBatchToBranch,
  getSharedBatchById,
} from "../../services/sharedBatchService";
import type {
  SharedBatch,
  SharedBatchAssignmentStatus,
  SharedBatchTransaction,
} from "../../types/SharedBatch";

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

function getBatchProgress(batch: SharedBatch) {
  const completed = batch.transactions.filter(
    (transaction) => transaction.status === "Completed"
  ).length;
  const awaitingProof = batch.transactions.filter(
    (transaction) => transaction.status === "Awaiting Proof"
  ).length;
  const processing = batch.transactions.filter(
    (transaction) => transaction.status === "Processing"
  ).length;
  const pending = batch.transactions.filter(
    (transaction) => transaction.status === "Pending"
  ).length;

  return { awaitingProof, completed, pending, processing };
}

export default function SharedBatchDetailsPage() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(() => getSharedBatchById(Number(batchId)));
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const progress = useMemo(() => {
    if (!batch) {
      return { awaitingProof: 0, completed: 0, pending: 0, processing: 0 };
    }

    return getBatchProgress(batch);
  }, [batch]);

  function handleAssignBatch() {
    const updatedBatch = assignSharedBatchToBranch(
      Number(batchId),
      Number(selectedBranchId)
    );

    if (updatedBatch) {
      setBatch({ ...updatedBatch });
    }
  }

  if (!batch) {
    return (
      <MainLayout>
        <PageContainer title="Shared Batch Details">
          <Card>
            <p>Batch not found.</p>
            <Link to="/shared-batches" style={{ color: "#1E5AA8", fontWeight: 600 }}>
              Back to shared batches
            </Link>
          </Card>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer title={`${batch.batchCode} Details`}>
        <div style={{ display: "grid", gap: 24 }}>
          <Card title="Assignment Decision">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: 20,
                alignItems: "end",
              }}
            >
              <div>
                <p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
                  Assign this received Excel batch to the branch responsible for
                  reviewing the listed transactions. Transaction rows are read-only
                  in this milestone.
                </p>
                <div style={{ marginTop: 14 }}>
                  <Badge
                    text={batch.assignmentStatus}
                    color={getBadgeColor(batch.assignmentStatus)}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    color: "#334155",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  Assign to branch
                </label>
                <select
                  value={selectedBranchId}
                  disabled={batch.assignmentStatus === "Completed"}
                  onChange={(event) => setSelectedBranchId(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid #CBD5E1",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    marginBottom: 12,
                  }}
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleAssignBatch}
                  variant={selectedBranchId ? "primary" : "secondary"}
                >
                  Assign Batch
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Batch Summary">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 20,
              }}
            >
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>File Name</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {batch.fileName}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Received</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {batch.receivedAt}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Assigned Branch</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {batch.assignedBranchName ?? "Not assigned"}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Total Amount</div>
                <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                  {batch.totalAmount.toLocaleString()} {batch.currency}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Progress Summary">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
              }}
            >
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Pending</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                  {progress.pending}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Processing</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                  {progress.processing}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Awaiting Proof</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                  {progress.awaitingProof}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Completed</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                  {progress.completed}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Read-Only Transactions">
            <DataTable<SharedBatchTransaction>
              data={batch.transactions}
              columns={[
                {
                  header: "Reference",
                  render: (transaction) => transaction.reference,
                },
                {
                  header: "Sender",
                  render: (transaction) => transaction.senderName,
                },
                {
                  header: "Receiver",
                  render: (transaction) => (
                    <div>
                      <div style={{ fontWeight: 700 }}>{transaction.receiverName}</div>
                      <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                        {transaction.receiverPhone}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Destination",
                  render: (transaction) => transaction.destinationCity,
                },
                {
                  header: "Amount",
                  render: (transaction) =>
                    `${transaction.amount.toLocaleString()} ${transaction.currency}`,
                },
                {
                  header: "Status",
                  render: (transaction) => transaction.status,
                },
              ]}
            />
          </Card>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link to="/shared-batches" style={{ textDecoration: "none" }}>
            <Button>Back to Shared Batches</Button>
          </Link>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
