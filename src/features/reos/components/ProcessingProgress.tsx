import { colors, radius, spacing, typography } from "../theme";

type ProcessingProgressProps = {
  currentPosition: number;
  totalTransactions: number;
};

export function ProcessingProgress({ currentPosition, totalTransactions }: ProcessingProgressProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        padding: spacing.lg,
      }}
    >
      <span style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>
        Current Position
      </span>
      <div style={{ color: colors.text, fontSize: typography.display, fontWeight: 600, marginTop: spacing.xs }}>
        {currentPosition} / {totalTransactions}
      </div>
    </div>
  );
}
