import { DataTable, type DataTableColumn } from "./common/DataTable";
import { colors, spacing, typography } from "../theme";
import type { OnHoldTransaction } from "../types/proofDownload";

type OnHoldTransactionsPanelProps = {
  transactions: OnHoldTransaction[];
};

/** The Direct Remit Officer's only view into why a transaction is paused - see the doc comment on buildProofDownloadBatchFromSharedBatch for why this can't come from the collapsed transaction-status list above it. */
export function OnHoldTransactionsPanel({ transactions }: OnHoldTransactionsPanelProps) {
  if (transactions.length === 0) {
    return null;
  }

  const columns: DataTableColumn<OnHoldTransaction>[] = [
    {
      key: "reference",
      header: "Beneficiary",
      render: (item) => (
        <div>
          <div style={{ color: colors.text, fontWeight: 600 }}>{item.beneficiaryName}</div>
          <div style={{ color: colors.muted, fontSize: typography.caption, marginTop: spacing.xs }}>{item.directRemitReference}</div>
        </div>
      ),
    },
    { key: "reason", header: "Hold Reason", render: (item) => item.holdReason?.name ?? "Not recorded" },
    { key: "comment", header: "Comment", render: (item) => item.holdComment ?? "-" },
    { key: "heldAt", header: "Held Since", render: (item) => (item.heldAt ? formatDateTime(item.heldAt) : "-") },
  ];

  return (
    <div style={{ display: "grid", gap: spacing.sm }}>
      <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>On Hold Transactions</h2>
      <DataTable columns={columns} getRowKey={(item) => item.transactionId} rows={transactions} />
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
