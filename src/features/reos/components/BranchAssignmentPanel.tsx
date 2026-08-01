import { useMemo, useState } from "react";
import { colors, radius, spacing, typography } from "../theme";
import type { Beneficiary } from "../types/beneficiary";
import type { SharedBatch } from "../types/sharedBatch";

type BranchAssignmentPanelProps = {
  beneficiaries: Beneficiary[];
  sharedBatch: SharedBatch;
  onConfirm: (branchId: string) => void;
  isAssignmentConfirmed: boolean;
};

const branchOptions = [
  { id: "PORT_SUDAN", label: "Port Sudan Branch" },
  { id: "KASSALA", label: "Kassala Branch" },
  { id: "DONGOLA", label: "Dongola Branch" },
  { id: "KOSTI", label: "Kosti Branch" },
];

export function BranchAssignmentPanel({ beneficiaries, sharedBatch, onConfirm, isAssignmentConfirmed }: BranchAssignmentPanelProps) {
  const [selectedBranchId, setSelectedBranchId] = useState(branchOptions[0].id);

  const readyTransactions = useMemo(
    () => beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "READY_FOR_ASSIGNMENT"),
    [beneficiaries],
  );

  const manualReviewCount = useMemo(
    () => beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "MANUAL_REVIEW").length,
    [beneficiaries],
  );

  const invalidCount = useMemo(
    () => beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "INVALID").length,
    [beneficiaries],
  );

  const canConfirm = Boolean(readyTransactions.length > 0 && selectedBranchId && !isAssignmentConfirmed);

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
            disabled={isAssignmentConfirmed}
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
          <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{readyTransactions.length}</div>
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
          Batch {sharedBatch.reference} will assign {readyTransactions.length} ready transactions to {branchOptions.find((branch) => branch.id === selectedBranchId)?.label ?? selectedBranchId}.
        </div>
      </div>

      <div style={{ marginTop: spacing.lg }}>
        <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Ready Transactions</div>
        {readyTransactions.length === 0 ? (
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>No ready transactions are available for assignment yet.</div>
        ) : (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.sm }}>
            {readyTransactions.map((beneficiary) => (
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
          {isAssignmentConfirmed ? "Assignment Confirmed" : "Confirm Assignment"}
        </button>
      </div>

      {isAssignmentConfirmed ? (
        <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, color: "#065F46", marginTop: spacing.lg, padding: 16 }}>
          Assignment confirmed. The batch is now assigned to {branchOptions.find((branch) => branch.id === selectedBranchId)?.label ?? selectedBranchId}.
        </div>
      ) : null}
    </div>
  );
}
