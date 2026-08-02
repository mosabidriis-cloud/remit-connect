import { Link } from "react-router-dom";
import { colors, radius, spacing, typography } from "../theme";

export type BranchProcessingNavigationTarget = {
  branchId: string;
  branchName: string;
};

type BranchProcessingNavigationProps = {
  targets: BranchProcessingNavigationTarget[];
};

/**
 * Operational navigation from Shared Batch Assignment to Branch Processing.
 * Mirrors ProofDownloadNavigation.tsx's pattern (Sprint 14 Milestone 2B).
 * Presentation only - it does not grant access; Branch Processing has no
 * actor-role gating of its own (TECH_DEBT.md), unchanged by this link.
 */
export function BranchProcessingNavigation({ targets }: BranchProcessingNavigationProps) {
  if (targets.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Branch Processing</div>
      <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
        Assigned transactions are ready for the branch to begin processing.
      </div>
      <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
        {targets.map((target) => (
          <Link
            key={target.branchId}
            to={`/reos/branches/${target.branchId}/processing`}
            style={{
              border: `1px solid ${colors.primary}`,
              borderRadius: radius.sm,
              color: colors.primary,
              fontSize: typography.small,
              fontWeight: 600,
              padding: `${spacing.sm}px ${spacing.md}px`,
              textDecoration: "none",
            }}
          >
            Open Branch Processing - {target.branchName}
          </Link>
        ))}
      </div>
    </div>
  );
}
