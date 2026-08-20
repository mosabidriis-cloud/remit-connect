import { DataTable, type DataTableColumn } from "./common/DataTable";
import { EmptyState } from "./common/EmptyState";
import { StatusBadge } from "./common/StatusBadge";
import { colors, spacing, typography } from "../theme";
import type { DownloadableProof } from "../types/proofDownload";
import type { ProofOfPaymentFileStatus } from "../types/proofOfPayment";

type ProofDownloadPanelProps = {
  actorCanDownload: boolean;
  proofs: DownloadableProof[];
  onDownloadProof: (proof: DownloadableProof) => void;
};

const statusLabels: Record<ProofOfPaymentFileStatus, string> = {
  TEMPORARY: "Available",
  DOWNLOADED: "Downloaded",
  EXPIRED: "Expired",
};

const statusTones: Record<ProofOfPaymentFileStatus, "blue" | "emerald" | "red"> = {
  TEMPORARY: "blue",
  DOWNLOADED: "emerald",
  EXPIRED: "red",
};

export function ProofDownloadPanel({ actorCanDownload, proofs, onDownloadProof }: ProofDownloadPanelProps) {
  const columns: DataTableColumn<DownloadableProof>[] = [
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
    {
      key: "amount",
      header: "Amount",
      render: (item) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {item.currency} {item.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "fileName",
      header: "Proof File",
      render: (item) => (
        <div>
          <div>{item.proof.fileName}</div>
          <div style={{ color: colors.muted, fontSize: typography.caption, marginTop: spacing.xs }}>{formatDateTime(item.proof.uploadedAt)}</div>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (item) => <StatusBadge label={statusLabels[item.proof.status]} tone={statusTones[item.proof.status]} /> },
    {
      key: "action",
      header: "Action",
      align: "right",
      render: (item) => (
        <button
          disabled={!actorCanDownload}
          onClick={() => onDownloadProof(item)}
          style={{
            background: "none",
            border: "none",
            color: actorCanDownload ? colors.primary : colors.muted,
            cursor: actorCanDownload ? "pointer" : "not-allowed",
            fontSize: typography.small,
            fontWeight: 600,
            padding: 0,
          }}
          type="button"
        >
          Download
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: spacing.sm }}>
      <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Individual Proof Images</h2>
      {proofs.length === 0 ? (
        <EmptyState message="No transactions have completed with a proof image yet - completed proofs will appear here as they land." />
      ) : (
        <DataTable columns={columns} getRowKey={(item) => item.proof.id} rows={proofs} />
      )}
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
