import { useState } from "react";
import { colors, radius, shadows, spacing, typography } from "../theme";
import type { SharedBatchLifecycleStatus } from "../types/sharedBatch";

type BatchDownloadActionsProps = {
  actorCanDownload: boolean;
  lifecycleStatus: SharedBatchLifecycleStatus;
  proofImageCount: number;
  isDownloadingZip: boolean;
  onDownloadZip: () => void;
  onConfirmDownloaded: () => void;
};

export function BatchDownloadActions({
  actorCanDownload,
  lifecycleStatus,
  proofImageCount,
  isDownloadingZip,
  onDownloadZip,
  onConfirmDownloaded,
}: BatchDownloadActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const canDownload = actorCanDownload && proofImageCount > 0 && lifecycleStatus === "READY_FOR_DOWNLOAD";
  const canConfirmDownloaded = actorCanDownload && lifecycleStatus === "READY_FOR_DOWNLOAD";

  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.sm, padding: spacing.lg }}>
      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
        <div>
          <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Proof Downloads</h2>
          <p style={{ color: colors.muted, fontSize: typography.small }}>{proofImageCount} proof image(s) available.</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
          <button
            className="transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1 disabled:hover:opacity-100"
            disabled={!canDownload || isDownloadingZip}
            onClick={onDownloadZip}
            style={{
              backgroundColor: canDownload && !isDownloadingZip ? colors.primary : colors.slate200,
              border: "none",
              borderRadius: radius.md,
              color: canDownload && !isDownloadingZip ? colors.surface : colors.muted,
              cursor: canDownload && !isDownloadingZip ? "pointer" : "not-allowed",
              fontSize: typography.small,
              fontWeight: 600,
              padding: `${spacing.sm}px ${spacing.lg}px`,
            }}
            type="button"
          >
            {isDownloadingZip ? "Preparing ZIP" : "Download ZIP"}
          </button>
          <button
            className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1 disabled:hover:opacity-100"
            disabled={!canConfirmDownloaded}
            onClick={() => setIsConfirming(true)}
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${canConfirmDownloaded ? colors.success : colors.border}`,
              borderRadius: radius.md,
              color: canConfirmDownloaded ? colors.success : colors.muted,
              cursor: canConfirmDownloaded ? "pointer" : "not-allowed",
              fontSize: typography.small,
              fontWeight: 600,
              padding: `${spacing.sm}px ${spacing.lg}px`,
            }}
            type="button"
          >
            Confirm
          </button>
        </div>
      </div>
      {isConfirming ? (
        <div
          style={{
            backgroundColor: colors.amber50,
            border: `1px solid ${colors.amber700}`,
            borderRadius: radius.sm,
            marginTop: spacing.lg,
            padding: spacing.lg,
          }}
        >
          <p style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>
            This action completes the REOS operational workflow for this batch.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
            <button
              className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1"
              onClick={() => setIsConfirming(false)}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                color: colors.text,
                cursor: "pointer",
                fontSize: typography.small,
                fontWeight: 600,
                padding: `${spacing.sm}px ${spacing.lg}px`,
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1"
              onClick={() => {
                setIsConfirming(false);
                onConfirmDownloaded();
              }}
              style={{
                backgroundColor: colors.success,
                border: "none",
                borderRadius: radius.md,
                color: colors.surface,
                cursor: "pointer",
                fontSize: typography.small,
                fontWeight: 600,
                padding: `${spacing.sm}px ${spacing.lg}px`,
              }}
              type="button"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
