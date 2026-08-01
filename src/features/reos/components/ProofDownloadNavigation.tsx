import { Link } from "react-router-dom";
import { colors, radius, spacing, typography } from "../theme";

export type ProofDownloadNavigationTarget = {
  sharedBatchId: string;
  sharedBatchReference: string;
};

type ProofDownloadNavigationProps = {
  targets: ProofDownloadNavigationTarget[];
};

/**
 * Operational navigation from Branch Processing to Proof Download.
 * Only rendered for Shared Batches already at READY_FOR_DOWNLOAD - the caller
 * performs that filtering. Proof Download remains Direct Remit Officer only;
 * this link does not grant access, ProofDownloadPage still applies its own
 * actor-role gating.
 */
export function ProofDownloadNavigation({ targets }: ProofDownloadNavigationProps) {
  if (targets.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Proof Download</div>
      <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
        Ready for the Direct Remit Officer to download proof-of-payment files.
      </div>
      <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
        {targets.map((target) => (
          <Link
            key={target.sharedBatchId}
            to={`/reos/shared-batches/${target.sharedBatchId}/proof-download`}
            style={{
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.sm,
              color: colors.primary,
              fontSize: typography.small,
              fontWeight: 600,
              padding: `${spacing.sm}px ${spacing.md}px`,
              textDecoration: "none",
            }}
          >
            Open Proof Download - {target.sharedBatchReference}
          </Link>
        ))}
      </div>
    </div>
  );
}
