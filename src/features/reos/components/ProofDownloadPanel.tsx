import { DataTable, type DataTableColumn } from "./common/DataTable";
import { EmptyState } from "./common/EmptyState";
import { colors, spacing, typography } from "../theme";
import type { DownloadableProof } from "../types/proofDownload";

type ProofDownloadPanelProps = {
  actorCanDownload: boolean;
  proofs: DownloadableProof[];
  onDownloadProof: (proof: DownloadableProof) => void;
};

export function ProofDownloadPanel({ actorCanDownload, proofs, onDownloadProof }: ProofDownloadPanelProps) {
  const columns: DataTableColumn<DownloadableProof>[] = [
    { key: "reference", header: "Direct Remit Reference", render: (item) => item.directRemitReference },
    { key: "fileName", header: "Proof Image", render: (item) => item.proof.fileName },
    { key: "uploadedAt", header: "Uploaded Time", render: (item) => formatDateTime(item.proof.uploadedAt) },
    { key: "status", header: "Status", render: (item) => item.proof.status },
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
          Download Individual Proof
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: spacing.sm }}>
      <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Individual Proof Images</h2>
      {proofs.length === 0 ? (
        <EmptyState message="No proof images are available for download." />
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
