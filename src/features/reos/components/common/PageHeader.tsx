import type { ReactNode } from "react";
import { colors, spacing, typography } from "../../theme";

type PageHeaderProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header
      className="flex flex-wrap items-start justify-between"
      style={{
        borderBottom: `1px solid ${colors.border}`,
        gap: spacing.lg,
        paddingBottom: spacing.lg,
      }}
    >
      <div>
        <h1 className="font-semibold" style={{ color: colors.text, fontSize: typography.h1, fontWeight: 600 }}>
          {title}
        </h1>
        <p className="mt-1" style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap justify-end" style={{ gap: spacing.md }}>{actions}</div> : null}
    </header>
  );
}
