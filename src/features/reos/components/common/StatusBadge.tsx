import { colors, radius, spacing, status, typography } from "../../theme";

type StatusBadgeTone = "blue" | "emerald" | "red" | "slate" | "amber";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
};

const toneStyles: Record<StatusBadgeTone, { backgroundColor: string; color: string; boxShadow: string }> = {
  [status.info]: {
    backgroundColor: colors.blue50,
    color: colors.blue700,
    boxShadow: `inset 0 0 0 1px ${colors.blue700}`,
  },
  [status.success]: {
    backgroundColor: colors.emerald50,
    color: colors.emerald700,
    boxShadow: `inset 0 0 0 1px ${colors.emerald700}`,
  },
  [status.danger]: {
    backgroundColor: colors.red50,
    color: colors.red700,
    boxShadow: `inset 0 0 0 1px ${colors.red700}`,
  },
  [status.neutral]: {
    backgroundColor: colors.slate100,
    color: colors.slate700,
    boxShadow: `inset 0 0 0 1px ${colors.slate200}`,
  },
  [status.warning]: {
    backgroundColor: colors.amber50,
    color: colors.amber700,
    boxShadow: `inset 0 0 0 1px ${colors.amber700}`,
  },
};

export function StatusBadge({ label, tone = "slate" }: StatusBadgeProps) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        backgroundColor: toneStyles[tone].backgroundColor,
        borderRadius: radius.sm,
        boxShadow: toneStyles[tone].boxShadow,
        color: toneStyles[tone].color,
        fontSize: typography.caption,
        fontWeight: 500,
        padding: `${spacing.xs}px ${spacing.sm}px`,
      }}
    >
      {label}
    </span>
  );
}
