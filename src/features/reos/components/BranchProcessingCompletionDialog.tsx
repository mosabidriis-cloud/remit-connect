import { colors, radius, spacing, typography } from "../theme";

type BranchProcessingCompletionDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  branchName: string;
  assignedCount: number;
  completedCount: number;
  returnedCount: number;
  completionPercentage: number;
};

export function BranchProcessingCompletionDialog({
  open,
  onCancel,
  onConfirm,
  branchName,
  assignedCount,
  completedCount,
  returnedCount,
  completionPercentage,
}: BranchProcessingCompletionDialogProps) {
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
        <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Finalize Processing</div>
        <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
          Confirm all transactions have been processed before marking this branch as completed.
        </p>

        <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.muted, fontSize: typography.small }}>Branch Name</span>
            <span style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{branchName}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.muted, fontSize: typography.small }}>Assigned Count</span>
            <span style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{assignedCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.muted, fontSize: typography.small }}>Completed Count</span>
            <span style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{completedCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.muted, fontSize: typography.small }}>Returned Count</span>
            <span style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{returnedCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.muted, fontSize: typography.small }}>Completion Percentage</span>
            <span style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{completionPercentage}%</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.lg }}>
          <button onClick={onCancel} style={{ backgroundColor: colors.slate100, border: "none", borderRadius: radius.sm, color: colors.text, cursor: "pointer", padding: `${spacing.sm}px ${spacing.lg}px` }} type="button">
            Cancel
          </button>
          <button onClick={onConfirm} style={{ backgroundColor: colors.primary, border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", padding: `${spacing.sm}px ${spacing.lg}px` }} type="button">
            Finalize Processing
          </button>
        </div>
      </div>
    </div>
  );
}
