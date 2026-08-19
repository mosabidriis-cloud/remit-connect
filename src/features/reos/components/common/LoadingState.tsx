import { colors, radius, spacing, typography } from "../../theme";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        color: colors.muted,
        fontSize: typography.small,
        padding: spacing.xl,
      }}
    >
      {message}
    </div>
  );
}
