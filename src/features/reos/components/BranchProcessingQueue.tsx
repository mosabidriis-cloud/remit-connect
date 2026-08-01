import { useMemo, useState } from "react";
import { colors, radius, spacing, typography } from "../theme";
import type { Assignment } from "../types/assignment";
import { getBranchProcessingQueueSummary, type BranchProcessingQueueItem, type BranchProcessingQueueStatus, updateBranchProcessingQueueItemStatus } from "../services/branchProcessingQueueService";

type BranchProcessingQueueProps = {
  assignments: Assignment[];
  branchId: string;
  branchName: string;
};

const statusColors: Record<BranchProcessingQueueStatus, { backgroundColor: string; color: string }> = {
  ASSIGNED: { backgroundColor: colors.blue50, color: colors.primary },
  IN_PROGRESS: { backgroundColor: colors.blue50, color: colors.primary },
  COMPLETED: { backgroundColor: "#ECFDF5", color: "#065F46" },
  ON_HOLD: { backgroundColor: "#FEF3C7", color: "#92400E" },
  RETURNED: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
};

const statusLabel: Record<BranchProcessingQueueStatus, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  RETURNED: "Returned",
};

export function BranchProcessingQueue({ assignments, branchId, branchName }: BranchProcessingQueueProps) {
  const [queueItems, setQueueItems] = useState<BranchProcessingQueueItem[]>(() => []);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useMemo(() => {
    const nextItems = assignments.flatMap((assignment) =>
      (assignment.assignedTransactions ?? []).map((beneficiary) => ({
        id: `${assignment.id}-${beneficiary.id}`,
        assignmentId: assignment.id,
        branchId,
        beneficiary,
        status: "ASSIGNED" as BranchProcessingQueueStatus,
      })),
    );

    setQueueItems(nextItems);
    setSelectedItemId(nextItems[0]?.id ?? null);
  }, [assignments, branchId]);

  const summary = useMemo(() => getBranchProcessingQueueSummary(branchId), [branchId, queueItems]);

  const selectedItem = queueItems.find((item) => item.id === selectedItemId) ?? null;

  const handleStatusChange = (status: BranchProcessingQueueStatus) => {
    if (!selectedItem) {
      return;
    }

    updateBranchProcessingQueueItemStatus(selectedItem.id, status);
    setQueueItems((current) => current.map((item) => (item.id === selectedItem.id ? { ...item, status } : item)));
  };

  return (
    <div style={{ display: "grid", gap: spacing.lg, gridTemplateColumns: "1.7fr 1fr" }}>
      <div>
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
          <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>{branchName}</div>
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
            Assigned transactions: {queueItems.length}
          </div>
          <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginTop: spacing.md }}>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Completed</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.completed}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>In Progress</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.inProgress}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>On Hold</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.onHold}</div>
            </div>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>Returned</div>
              <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{summary.returned}</div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, marginTop: spacing.lg, padding: spacing.lg }}>
          <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Transaction Queue</div>
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.sm }}>
            {queueItems.map((item) => {
              const styles = statusColors[item.status];
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
                    <div style={{ backgroundColor: styles.backgroundColor, borderRadius: 999, color: styles.color, fontSize: typography.caption, padding: "4px 8px" }}>
                      {statusLabel[item.status]}
                    </div>
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
              <button onClick={() => handleStatusChange("IN_PROGRESS")} style={{ backgroundColor: colors.primary, border: "none", borderRadius: radius.sm, color: colors.surface, padding: `${spacing.sm}px ${spacing.md}px` }} type="button">
                Start Processing
              </button>
              <button onClick={() => handleStatusChange("COMPLETED")} style={{ backgroundColor: "#2563EB", border: "none", borderRadius: radius.sm, color: colors.surface, padding: `${spacing.sm}px ${spacing.md}px` }} type="button">
                Complete
              </button>
              <button onClick={() => handleStatusChange("ON_HOLD")} style={{ backgroundColor: "#F59E0B", border: "none", borderRadius: radius.sm, color: colors.surface, padding: `${spacing.sm}px ${spacing.md}px` }} type="button">
                Put On Hold
              </button>
              <button onClick={() => handleStatusChange("RETURNED")} style={{ backgroundColor: "#DC2626", border: "none", borderRadius: radius.sm, color: colors.surface, padding: `${spacing.sm}px ${spacing.md}px` }} type="button">
                Return
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: colors.muted, fontSize: typography.small }}>Select a transaction from the queue.</div>
        )}
      </div>
    </div>
  );
}
