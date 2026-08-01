import { useMemo, useState } from "react";
import { StatusBadge } from "./common/StatusBadge";
import { BranchProcessingCompletionDialog } from "./BranchProcessingCompletionDialog";
import { colors, radius, spacing, typography } from "../theme";
import type { Assignment } from "../types/assignment";
import {
  finalizeBranchProcessing,
  getBranchProcessingQueue,
  getBranchProcessingQueueSummary,
  getBranchProcessingStatus,
  hydrateBranchProcessingQueue,
  isBranchProcessingComplete,
  type BranchProcessingQueueItem,
  type BranchProcessingQueueStatus,
  type BranchProcessingStatus,
  updateBranchProcessingQueueItemStatus,
} from "../services/branchProcessingQueueService";

type BranchProcessingQueueProps = {
  assignments: Assignment[];
  branchId: string;
  branchName: string;
};

const statusLabel: Record<BranchProcessingQueueStatus, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  RETURNED: "Returned",
};

const statusTone: Record<BranchProcessingQueueStatus, "blue" | "emerald" | "amber" | "red" | "slate"> = {
  ASSIGNED: "blue",
  IN_PROGRESS: "blue",
  COMPLETED: "emerald",
  ON_HOLD: "amber",
  RETURNED: "red",
};

export function BranchProcessingQueue({ assignments, branchId, branchName }: BranchProcessingQueueProps) {
  const [queueItems, setQueueItems] = useState<BranchProcessingQueueItem[]>(() => []);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [branchStatus, setBranchStatus] = useState<BranchProcessingStatus>("PROCESSING");
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

  useMemo(() => {
    const nextItems = hydrateBranchProcessingQueue(branchId, assignments);
    setQueueItems(nextItems);
    setSelectedItemId(nextItems[0]?.id ?? null);
    setBranchStatus(getBranchProcessingStatus(branchId));
  }, [assignments, branchId]);

  const summary = useMemo(() => getBranchProcessingQueueSummary(branchId), [branchId, queueItems]);
  const canFinalize = useMemo(() => isBranchProcessingComplete(branchId), [branchId, queueItems]);

  const isLocked = branchStatus === "READY_FOR_PROOF";
  const selectedItem = queueItems.find((item) => item.id === selectedItemId) ?? null;

  const handleStatusChange = (status: BranchProcessingQueueStatus) => {
    if (!selectedItem || isLocked) {
      return;
    }

    updateBranchProcessingQueueItemStatus(selectedItem.id, status);
    setQueueItems(getBranchProcessingQueue(branchId));
  };

  const handleConfirmFinalize = () => {
    const result = finalizeBranchProcessing(branchId);

    if (result) {
      setBranchStatus(result);
    }

    setShowFinalizeDialog(false);
  };

  return (
    <div style={{ display: "grid", gap: spacing.lg, gridTemplateColumns: "1.7fr 1fr" }}>
      <div>
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>{branchName}</div>
            <StatusBadge label={isLocked ? "READY_FOR_PROOF" : "PROCESSING"} tone={isLocked ? "emerald" : "blue"} />
          </div>
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
            Assigned transactions: {queueItems.length}
          </div>
          <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginTop: spacing.md }}>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Assigned</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.assigned}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>In Progress</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.inProgress}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Completed</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.completed}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>On Hold</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.onHold}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Returned</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.returned}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Remaining</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.remaining}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Completion</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.completionPercentage}%</div>
            </div>
          </div>

          <div style={{ marginTop: spacing.lg }}>
            {isLocked ? (
              <div style={{ color: colors.muted, fontSize: typography.small }}>
                Processing session locked. Queue is read-only.
              </div>
            ) : (
              <button
                disabled={!canFinalize}
                onClick={() => setShowFinalizeDialog(true)}
                style={{
                  backgroundColor: canFinalize ? colors.primary : colors.slate200,
                  border: "none",
                  borderRadius: radius.sm,
                  color: canFinalize ? colors.surface : colors.muted,
                  cursor: canFinalize ? "pointer" : "not-allowed",
                  padding: `${spacing.sm}px ${spacing.md}px`,
                }}
                type="button"
              >
                Finalize Processing
              </button>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, marginTop: spacing.lg, padding: spacing.lg }}>
          <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Transaction Queue</div>
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.sm }}>
            {queueItems.map((item) => {
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  style={{
                    backgroundColor: item.id === selectedItemId ? colors.blue50 : colors.surface,
                    border: `1px solid ${item.id === selectedItemId ? colors.primary : colors.border}`,
                    borderRadius: radius.sm,
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    textAlign: "left",
                  }}
                  type="button"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.sm }}>
                    <div>
                      <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{item.beneficiary.directRemitReference}</div>
                      <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                        {item.beneficiary.beneficiaryName}
                      </div>
                    </div>
                    <StatusBadge label={statusLabel[item.status]} tone={statusTone[item.status]} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        {selectedItem ? (
          <>
            <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Transaction Details</div>
            <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
              Reference: {selectedItem.beneficiary.directRemitReference}
            </div>
            <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
              Beneficiary: {selectedItem.beneficiary.beneficiaryName}
            </div>
            <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
              Amount: {selectedItem.beneficiary.currency} {selectedItem.beneficiary.amount.toFixed(2)}
            </div>
            <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
              Bank: {selectedItem.beneficiary.bankName}
            </div>
            <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
              Account Number: {selectedItem.beneficiary.accountNumber}
            </div>

            <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.lg }}>
              {isLocked && (
                <div style={{ color: colors.muted, fontSize: typography.small }}>
                  Processing session locked. Queue is read-only.
                </div>
              )}
              {!isLocked && (selectedItem.status === "ASSIGNED" || selectedItem.status === "ON_HOLD") && (
                <button
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  style={{ backgroundColor: colors.primary, border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", padding: `${spacing.sm}px ${spacing.md}px` }}
                  type="button"
                >
                  {selectedItem.status === "ON_HOLD" ? "Resume Processing" : "Start Processing"}
                </button>
              )}
              {!isLocked && selectedItem.status === "IN_PROGRESS" && (
                <>
                  <button
                    onClick={() => handleStatusChange("COMPLETED")}
                    style={{ backgroundColor: "#2563EB", border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", padding: `${spacing.sm}px ${spacing.md}px` }}
                    type="button"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleStatusChange("ON_HOLD")}
                    style={{ backgroundColor: "#F59E0B", border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", padding: `${spacing.sm}px ${spacing.md}px` }}
                    type="button"
                  >
                    Put On Hold
                  </button>
                  <button
                    onClick={() => handleStatusChange("RETURNED")}
                    style={{ backgroundColor: "#DC2626", border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", padding: `${spacing.sm}px ${spacing.md}px` }}
                    type="button"
                  >
                    Return
                  </button>
                </>
              )}
              {!isLocked && (selectedItem.status === "COMPLETED" || selectedItem.status === "RETURNED") && (
                <div style={{ color: colors.muted, fontSize: typography.small }}>No actions available.</div>
              )}
            </div>
          </>
        ) : (
          <div style={{ color: colors.muted, fontSize: typography.small }}>Select a transaction from the queue.</div>
        )}
      </div>

      <BranchProcessingCompletionDialog
        assignedCount={summary.total}
        branchName={branchName}
        completedCount={summary.completed}
        completionPercentage={summary.completionPercentage}
        onCancel={() => setShowFinalizeDialog(false)}
        onConfirm={handleConfirmFinalize}
        open={showFinalizeDialog}
        returnedCount={summary.returned}
      />
    </div>
  );
}
