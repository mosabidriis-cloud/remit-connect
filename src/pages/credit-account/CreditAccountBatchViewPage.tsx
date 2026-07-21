import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import MainLayout from "../../layouts/MainLayout";
import PageContainer from "../../components/PageContainer";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import {
  getCreditToAccountAssignedBatchById,
  getCreditToAccountOfficerBranch,
} from "../../services/sharedBatchService";
import type { SharedBatchTransaction } from "../../types/SharedBatch";

function getTransactionSummary(transactions: SharedBatchTransaction[]) {
  const completed = transactions.filter(
    (transaction) => transaction.status === "Completed"
  ).length;
  const exceptions = 0;
  const remaining = transactions.length - completed;

  return { completed, exceptions, remaining };
}

function StatusDot() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: "#F59E0B",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

export default function CreditAccountBatchViewPage() {
  const { batchId } = useParams();
  const [actionRecord, setActionRecord] = useState("");
  const officerBranch = getCreditToAccountOfficerBranch();
  const batch = getCreditToAccountAssignedBatchById(
    Number(batchId),
    officerBranch?.id
  );

  if (!batch) {
    return (
      <MainLayout>
        <PageContainer title="Transaction Processing">
          <Card>
            <p>
              Assigned batch not found for{" "}
              {officerBranch?.name ?? "the officer branch"}.
            </p>
            <Link to="/credit-account" style={{ color: "#1E5AA8", fontWeight: 600 }}>
              Back to workspace
            </Link>
          </Card>
        </PageContainer>
      </MainLayout>
    );
  }

  const currentTransaction = batch.transactions[0];
  const summary = getTransactionSummary(batch.transactions);

  return (
    <MainLayout>
      <PageContainer title="Transaction Processing">
        <div style={{ display: "grid", gap: 24 }}>
          <Card title={`${batch.batchCode} Batch Summary`}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 20,
              }}
            >
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Completed</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                  {summary.completed}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Remaining</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                  {summary.remaining}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: 13 }}>Exceptions</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#123A73" }}>
                  {summary.exceptions}
                </div>
              </div>
            </div>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              alignItems: "start",
            }}
          >
            <Card title="Remaining Transactions">
              <div style={{ display: "grid", gap: 12 }}>
                {batch.transactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 12,
                      padding: 14,
                      background: index === 0 ? "#F8FAFC" : "#FFFFFF",
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <StatusDot />
                        <span style={{ fontWeight: 700, color: "#123A73" }}>
                          {transaction.reference}
                        </span>
                      </div>
                      <Badge text={transaction.status} color="orange" />
                    </div>
                    <div style={{ color: "#475569", fontSize: 14 }}>
                      {transaction.receiverName}
                    </div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>
                      {transaction.amount.toLocaleString()} {transaction.currency}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Current Transaction">
              <div style={{ display: "grid", gap: 24 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 20,
                  }}
                >
                  <div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>Beneficiary</div>
                    <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                      {currentTransaction.receiverName}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>Bank</div>
                    <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                      {currentTransaction.receiverBank}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>Account Number</div>
                    <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                      {currentTransaction.receiverAccountNumber}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>Amount</div>
                    <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                      {currentTransaction.amount.toLocaleString()}{" "}
                      {currentTransaction.currency}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>
                      Reference Number
                    </div>
                    <div style={{ fontWeight: 700, color: "#123A73", marginTop: 4 }}>
                      {currentTransaction.reference}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <Button
                    onClick={() =>
                      setActionRecord(
                        `Payment Completed action recorded for ${currentTransaction.reference}.`
                      )
                    }
                  >
                    Payment Completed
                  </Button>
                  <Button variant="danger">Report Issue</Button>
                  <Button variant="secondary">Next Transaction</Button>
                </div>

                {actionRecord && (
                  <div
                    style={{
                      border: "1px solid #BAE6FD",
                      background: "#F0F9FF",
                      color: "#075985",
                      borderRadius: 12,
                      padding: 14,
                      fontWeight: 600,
                    }}
                  >
                    {actionRecord}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Link to="/credit-account" style={{ textDecoration: "none" }}>
            <Button>Back to Workspace</Button>
          </Link>
        </div>
      </PageContainer>
    </MainLayout>
  );
}
