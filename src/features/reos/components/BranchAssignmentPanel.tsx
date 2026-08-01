import { useMemo, useState } from "react";
import { colors, radius, spacing, typography } from "../theme";
import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type { SharedBatch } from "../types/sharedBatch";

type BranchAssignmentPanelProps = {
  beneficiaries: Beneficiary[];
  sharedBatch: SharedBatch;
  assignment: Assignment | null;
  assignments: Assignment[];
  assignedBeneficiaryIds: string[];
  onConfirm: (branchId: string) => void;
  isAssignmentConfirmed: boolean;
};

const branchOptions = [
  { id: "PORT_SUDAN", label: "Port Sudan Branch" },
  { id: "KASSALA", label: "Kassala Branch" },
  { id: "DONGOLA", label: "Dongola Branch" },
  { id: "KOSTI", label: "Kosti Branch" },
];

export function BranchAssignmentPanel({ beneficiaries, sharedBatch, assignment, assignments, assignedBeneficiaryIds, onConfirm, isAssignmentConfirmed }: BranchAssignmentPanelProps) {
  const [selectedBranchId, setSelectedBranchId] = useState(branchOptions[0].id);

  const pendingReadyTransactions = useMemo(
    () => beneficiaries.filter(
      (beneficiary) => beneficiary.processingStatusId === "READY_FOR_ASSIGNMENT" && !assignedBeneficiaryIds.includes(beneficiary.id),
    ),
    [assignedBeneficiaryIds, beneficiaries],
  );

  const manualReviewCount = useMemo(
    () => beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "MANUAL_REVIEW").length,
    [beneficiaries],
  );

  const invalidCount = useMemo(
    () => beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "INVALID").length,
    [beneficiaries],
  );

  const assignedTransactionCount = useMemo(
    () => assignments.reduce((total, currentAssignment) => total + currentAssignment.assignedTransactions.length, 0),
    [assignments],
  );

  const canConfirm = Boolean(pendingReadyTransactions.length > 0 && selectedBranchId);
  const hasAssignments = assignments.length > 0;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Branch Assignment</div>
      <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
        Ready transactions will be assigned to the selected branch. Manual review and invalid entries remain in the batch and stay out of the assignment queue.
      </p>

      <div style={{ display: "grid", gap: spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: spacing.lg }}>
        <div>
          <label style={{ color: colors.muted, display: "block", fontSize: typography.caption, fontWeight: 600, marginBottom: spacing.xs, textTransform: "uppercase" }} htmlFor="branch-select">
            Assigned Branch
          </label>
          <select
            id="branch-select"
            onChange={(event) => setSelectedBranchId(event.target.value)}
            style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: "8px 10px", width: "100%" }}
            value={selectedBranchId}
          >
            {branchOptions.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Ready for Assignment</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{pendingReadyTransactions.length}</div>
        </div>
        <div>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Manual Review</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{manualReviewCount}</div>
        </div>
        <div>
          <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Invalid</div>
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{invalidCount}</div>
        </div>
      </div>

      <div style={{ backgroundColor: colors.blue50, border: `1px solid ${colors.border}`, borderRadius: radius.sm, marginTop: spacing.lg, padding: spacing.md }}>
        <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Assignment Summary</div>
        <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
          Batch {sharedBatch.reference} currently has {assignments.length} assignment group{assignments.length === 1 ? "" : "s"} and {assignedTransactionCount} assigned transaction{assignedTransactionCount === 1 ? "" : "s"}.
        </div>
        <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
          {pendingReadyTransactions.length} ready transaction{pendingReadyTransactions.length === 1 ? "" : "s"} remain available for assignment.
        </div>
        {assignment ? (
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
            Latest assignment ID: {assignment.id} • Status: {assignment.status}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: spacing.lg }}>
        <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Assignment Groups</div>
        {assignments.length === 0 ? (
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>No branch assignment groups have been created yet.</div>
        ) : (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.sm }}>
            {assignments.map((currentAssignment) => (
              <div key={currentAssignment.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
                <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{currentAssignment.assignedBranchName ?? currentAssignment.assignedBranchId}</div>
                <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                  {currentAssignment.assignedTransactions.length} transaction{currentAssignment.assignedTransactions.length === 1 ? "" : "s"} assigned • {currentAssignment.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: spacing.lg }}>
        <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Pending Ready Transactions</div>
        {pendingReadyTransactions.length === 0 ? (
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>All ready transactions are already assigned to a branch group.</div>
        ) : (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.sm }}>
            {pendingReadyTransactions.map((beneficiary) => (
              <div key={beneficiary.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
                <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{beneficiary.directRemitReference}</div>
                <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                  {beneficiary.beneficiaryName} • {beneficiary.currency} {beneficiary.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: spacing.lg }}>
        <button
          disabled={!canConfirm}
          onClick={() => onConfirm(selectedBranchId)}
          style={{
            backgroundColor: canConfirm ? colors.primary : colors.slate200,
            border: "none",
            borderRadius: radius.sm,
            color: canConfirm ? colors.surface : colors.muted,
            cursor: canConfirm ? "pointer" : "not-allowed",
            padding: `${spacing.sm}px ${spacing.lg}px`,
          }}
          type="button"
        >
          {hasAssignments ? "Confirm Another Assignment" : "Confirm Assignment"}
        </button>
      </div>

      {isAssignmentConfirmed ? (
        <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, color: "#065F46", marginTop: spacing.lg, padding: 16 }}>
          Assignment group created. The batch now contains {assignments.length} branch assignment group{assignments.length === 1 ? "" : "s"}.
        </div>
      ) : null}
    </div>
  );
}
