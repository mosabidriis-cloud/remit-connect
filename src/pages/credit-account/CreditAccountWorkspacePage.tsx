import { Link } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";
import {
  getCreditToAccountAssignedBatches,
  getCreditToAccountOfficerBranch,
  getSharedBatchProgressText,
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

export default function CreditAccountWorkspacePage() {
  const officerBranch = getCreditToAccountOfficerBranch();
  const assignedBatches = getCreditToAccountAssignedBatches(officerBranch?.id);

  return (
    <MainLayout>
      <PageContainer title="Credit to Account Workspace">
        <Card title="Officer Branch Scope">
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
            This workspace shows only Direct Remit batches assigned to{" "}
            <strong>{officerBranch?.name ?? "the officer branch"}</strong>.
            Batch and transaction data is read-only in this milestone.
          </p>
        </Card>

        <div style={{ marginTop: 24 }}>
          <Card title="Assigned Batches">
            <DataTable<SharedBatch>
              data={assignedBatches}
              columns={[
                {
                  header: "Batch Number",
                  render: (batch) => batch.batchCode,
                },
                {
                  header: "Assignment Date",
                  render: (batch) => batch.assignedAt ?? "Not assigned",
                },
                {
                  header: "Assigned By",
                  render: (batch) => batch.assignedBy ?? "Operations Manager",
                },
                {
                  header: "Branch",
                  render: (batch) => batch.assignedBranchName ?? "Not assigned",
                },
                {
                  header: "Transaction Count",
                  render: (batch) => batch.transactionCount,
                },
                {
                  header: "Progress",
                  render: (batch) => getSharedBatchProgressText(batch),
                },
                {
                  header: "Batch Status",
                  render: (batch) => (
                    <Badge
                      text={batch.assignmentStatus}
                      color={getBadgeColor(batch.assignmentStatus)}
                    />
                  ),
                },
                {
                  header: "Open Batch",
                  render: (batch) => (
                    <Link
                      to={`/credit-account/batches/${batch.id}`}
                      style={{
                        color: "#1E5AA8",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      Open Batch
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
