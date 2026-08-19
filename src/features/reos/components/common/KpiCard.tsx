import { colors, radius, shadows, spacing, typography } from "../../theme";

type KpiCardVariant = "default" | "anchor" | "warning" | "danger";

type KpiCardProps = {
  label: string;
  value: string;
  detail: string;
  /**
   * "anchor" is the page's one headline metric (e.g. Transactions Today, Total Liquidity) -
   * full brand-gradient treatment, inverted text. "warning"/"danger" flag a risk-count
   * metric (e.g. Low Balance Branches) via a colored left-border accent instead of the
   * default brand-blue one. Everything else stays "default".
   */
  variant?: KpiCardVariant;
};

const accentColor: Record<Exclude<KpiCardVariant, "anchor">, string> = {
  default: colors.primary,
  warning: colors.warning,
  danger: colors.danger,
};

export function KpiCard({ label, value, detail, variant = "default" }: KpiCardProps) {
  if (variant === "anchor") {
    return (
      <article
        style={{
          background: colors.brandGradient,
          borderRadius: radius.xl,
          boxShadow: shadows.md,
          overflow: "hidden",
          padding: spacing.xl,
          position: "relative",
        }}
      >
        <div
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            inset: 0,
            opacity: 0.06,
            pointerEvents: "none",
            position: "absolute",
          }}
        />
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: typography.caption, fontWeight: 600, letterSpacing: "0.04em", position: "relative", textTransform: "uppercase" }}>
          {label}
        </div>
        <div style={{ color: colors.white, fontSize: typography.display, fontVariantNumeric: "tabular-nums", fontWeight: 700, lineHeight: 1.15, marginTop: spacing.sm, position: "relative" }}>
          {value}
        </div>
        <p style={{ color: "rgba(255,255,255,0.72)", fontSize: typography.small, marginTop: spacing.xs, position: "relative" }}>{detail}</p>
      </article>
    );
  }

  return (
    <article
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.slate200}`,
        borderLeft: `4px solid ${accentColor[variant]}`,
        borderRadius: radius.xl,
        boxShadow: shadows.md,
        padding: spacing.xl,
      }}
    >
      <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ color: colors.text, fontSize: typography.display, fontVariantNumeric: "tabular-nums", fontWeight: 700, lineHeight: 1.15, marginTop: spacing.sm }}>
        {value}
      </div>
      <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>{detail}</p>
    </article>
  );
}
