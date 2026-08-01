import { colors, radius, spacing, typography } from "../theme";
import type { Assignment } from "../types/assignment";
import type { SharedBatch } from "../types/sharedBatch";

type AssignmentSummaryProps = {
  sharedBatch: SharedBatch;
  assignments: Assignment[];
  manualReviewCount: number;
  invalidCount: number;
};

export function AssignmentSummary({ sharedBatch, assignments, manualReviewCount, invalidCount }: AssignmentSummaryProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        marginTop: spacing.lg,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Final Assignment Summary</div>
      <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
        Batch reference: {sharedBatch.reference}
      </div>
      <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
        Batch status: {sharedBatch.assignmentStatus}
      </div>
      <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
        Branch assignment groups: {assignments.length}
      </div>
      <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
        Processing mode: Process Valid Transactions Only
      </div>

      <div style={{ marginTop: spacing.md }}>
        <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Branch Assignment Groups</div>
        <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.sm }}>
          {assignments.map((currentAssignment) => (
            <div key={currentAssignment.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{currentAssignment.assignedBranchName ?? currentAssignment.assignedBranchId}</div>
              <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                Assigned transactions: {currentAssignment.assignedTransactions.length}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: spacing.md }}>
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Manual Review</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{manualReviewCount}</div>
        </div>
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Invalid</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{invalidCount}</div>
        </div>
      </div>
    </div>
  );
}
