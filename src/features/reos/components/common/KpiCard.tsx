import { colors, radius, spacing, typography } from "../../theme";

type KpiCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <article
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: colors.text, fontSize: typography.h2, fontWeight: 600, marginTop: spacing.sm }}>{value}</div>
      <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>{detail}</p>
    </article>
  );
}
