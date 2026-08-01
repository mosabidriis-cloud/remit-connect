import { colors, radius, spacing, typography } from "../theme";

type ConfirmUploadDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  canConfirm: boolean;
  summary: {
    batchReference: string;
    fileName: string;
    readyForAssignment: boolean;
  };
};

export function ConfirmUploadDialog({ open, onCancel, onConfirm, canConfirm, summary }: ConfirmUploadDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "rgba(2, 6, 23, 0.45)",
        inset: 0,
        padding: spacing.lg,
        position: "fixed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          maxWidth: 460,
          padding: spacing.xl,
          width: "100%",
        }}
      >
        <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Confirm Upload</div>
        <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
          Confirm the mocked upload for {summary.batchReference} from {summary.fileName}.
        </p>
        <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.md }}>
          {summary.readyForAssignment ? "The batch is ready for assignment." : "The batch requires additional review before assignment."}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.lg }}>
          <button onClick={onCancel} style={{ backgroundColor: colors.slate100, border: "none", borderRadius: radius.sm, color: colors.text, cursor: "pointer", padding: `${spacing.sm}px ${spacing.lg}px` }} type="button">
            Cancel
          </button>
          <button disabled={!canConfirm} onClick={onConfirm} style={{ backgroundColor: canConfirm ? colors.primary : colors.slate200, border: "none", borderRadius: radius.sm, color: canConfirm ? colors.surface : colors.muted, cursor: canConfirm ? "pointer" : "not-allowed", padding: `${spacing.sm}px ${spacing.lg}px` }} type="button">
            Confirm Upload
          </button>
        </div>
      </div>
    </div>
  );
}
