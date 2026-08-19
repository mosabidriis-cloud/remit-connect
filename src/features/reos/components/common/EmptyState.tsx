import { colors, radius, spacing, typography } from "../../theme";

type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        display: "flex",
        flexDirection: "column",
        gap: spacing.sm,
        padding: spacing.xxl,
        textAlign: "center",
      }}
    >
      <TrayIcon />
      <span style={{ color: colors.muted, fontSize: typography.small }}>{message}</span>
    </div>
  );
}

function TrayIcon() {
  return (
    <svg
      fill="none"
      height={32}
      stroke={colors.slate300}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      width={32}
    >
      <path d="M4 12h4l2 3h4l2-3h4" />
      <path d="M5.5 6h13l2 6v7a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-7l2-6Z" />
    </svg>
  );
}
