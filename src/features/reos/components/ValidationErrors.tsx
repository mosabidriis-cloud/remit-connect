import { colors, radius, spacing, typography } from "../theme";

type ValidationIssue = {
  id: string;
  field: string;
  message: string;
  severity: "ERROR" | "WARNING";
};

type ValidationErrorsProps = {
  issues: ValidationIssue[];
};

export function ValidationErrors({ issues }: ValidationErrorsProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Validation Errors</div>
      <ul style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md, paddingLeft: spacing.lg }}>
        {issues.map((issue) => (
          <li key={issue.id}>
            <div style={{ color: issue.severity === "ERROR" ? colors.danger : colors.warning, fontSize: typography.small, fontWeight: 600 }}>
              {issue.severity}: {issue.field}
            </div>
            <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>{issue.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
