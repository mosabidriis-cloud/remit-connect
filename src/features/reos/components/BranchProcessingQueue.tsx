import { useMemo, useState } from "react";
import { StatusBadge } from "./common/StatusBadge";
import { BranchProcessingCompletionDialog } from "./BranchProcessingCompletionDialog";
import { ProofGallery } from "./ProofGallery";
import { ProofUpload } from "./ProofUpload";
import { ReturnTransactionDialog } from "./ReturnTransactionDialog";
import { colors, radius, spacing, typography } from "../theme";
import { createProofOfPayment } from "../services/proofOfPaymentService";
import { getActiveReturnReasons } from "../services/transactionProcessingService";
import type { Assignment } from "../types/assignment";
import {
  addProofToBranchProcessingQueueItem,
  completeBranchProcessingQueueItem,
  finalizeBranchProcessing,
  getBranchProcessingQueue,
  getBranchProcessingQueueSummary,
  getBranchProcessingStatus,
  hydrateBranchProcessingQueue,
  isBranchProcessingComplete,
  returnBranchProcessingQueueItem,
  type BranchProcessingQueueItem,
  type BranchProcessingQueueStatus,
  type BranchProcessingStatus,
  updateBranchProcessingQueueItemStatus,
} from "../services/branchProcessingQueueService";

const branchOfficerUserId = "BRANCH_OFFICER";

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

type QueueStatTileProps = {
  label: string;
  value: string | number;
};

function QueueStatTile({ label, value }: QueueStatTileProps) {
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}>
      <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.xs }}>{value}</div>
    </div>
  );
}

function LockedQueueNotice() {
  return (
    <div style={{ color: colors.muted, fontSize: typography.small }}>
      Processing session locked. Queue is read-only.
    </div>
  );
}

export function BranchProcessingQueue({ assignments, branchId, branchName }: BranchProcessingQueueProps) {
  const [queueItems, setQueueItems] = useState<BranchProcessingQueueItem[]>(() => []);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [branchStatus, setBranchStatus] = useState<BranchProcessingStatus>("PROCESSING");
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useMemo(() => {
    const nextItems = hydrateBranchProcessingQueue(branchId, assignments);
    setQueueItems(nextItems);
    setSelectedItemId(nextItems[0]?.id ?? null);
    setBranchStatus(getBranchProcessingStatus(branchId));
  }, [assignments, branchId]);

  const summary = useMemo(() => getBranchProcessingQueueSummary(branchId), [branchId, queueItems]);
  const canFinalize = useMemo(() => isBranchProcessingComplete(branchId), [branchId, queueItems]);
  const returnReasons = useMemo(() => getActiveReturnReasons(), []);

  const isLocked = branchStatus === "COMPLETED";
  const selectedItem = queueItems.find((item) => item.id === selectedItemId) ?? null;
  const canComplete = Boolean(selectedItem && selectedItem.status === "IN_PROGRESS" && selectedItem.proofs.length > 0);

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setMessage(null);
  };

  const handleStatusChange = (status: BranchProcessingQueueStatus) => {
    if (!selectedItem || isLocked) {
      return;
    }

    updateBranchProcessingQueueItemStatus(selectedItem.id, status);
    setQueueItems(getBranchProcessingQueue(branchId));
  };

  const handleProofUpload = (files: File[]) => {
    if (!selectedItem) {
      return;
    }

    try {
      files.forEach((file) => {
        const proof = createProofOfPayment(file, selectedItem.id, branchOfficerUserId);
        addProofToBranchProcessingQueueItem(selectedItem.id, proof);
      });

      setQueueItems(getBranchProcessingQueue(branchId));
      setMessage(null);
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to upload proof.");
    }
  };

  const handleComplete = () => {
    if (!selectedItem) {
      return;
    }

    try {
      completeBranchProcessingQueueItem(selectedItem.id);
      setQueueItems(getBranchProcessingQueue(branchId));
      setMessage("Transaction completed.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to complete transaction.");
    }
  };

  const handleReturn = (returnReasonId: string, comment: string) => {
    if (!selectedItem) {
      return;
    }

    const returnReason = returnReasons.find((reason) => reason.id === returnReasonId);

    if (!returnReason) {
      setMessage("A predefined Return Reason is required.");
      return;
    }

    try {
      returnBranchProcessingQueueItem(selectedItem.id, returnReason, comment);
      setQueueItems(getBranchProcessingQueue(branchId));
      setMessage("Transaction returned.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to return transaction.");
    }
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
            <StatusBadge label={isLocked ? "COMPLETED" : "PROCESSING"} tone={isLocked ? "emerald" : "blue"} />
          </div>
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
            Assigned transactions: {queueItems.length}
          </div>
          <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginTop: spacing.md }}>
            <QueueStatTile label="Assigned" value={summary.assigned} />
            <QueueStatTile label="In Progress" value={summary.inProgress} />
            <QueueStatTile label="Completed" value={summary.completed} />
            <QueueStatTile label="On Hold" value={summary.onHold} />
            <QueueStatTile label="Returned" value={summary.returned} />
            <QueueStatTile label="Remaining" value={summary.remaining} />
            <QueueStatTile label="Completion" value={`${summary.completionPercentage}%`} />
          </div>

          <div style={{ marginTop: spacing.lg }}>
            {isLocked ? (
              <LockedQueueNotice />
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
                  onClick={() => handleSelectItem(item.id)}
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
              {isLocked && <LockedQueueNotice />}
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
                  <ProofUpload onUpload={handleProofUpload} />
                  <ProofGallery proofs={selectedItem.proofs} />
                  <button
                    disabled={!canComplete}
                    onClick={handleComplete}
                    style={{
                      backgroundColor: canComplete ? colors.primary : colors.slate200,
                      border: "none",
                      borderRadius: radius.sm,
                      color: canComplete ? colors.surface : colors.muted,
                      cursor: canComplete ? "pointer" : "not-allowed",
                      padding: `${spacing.sm}px ${spacing.md}px`,
                    }}
                    type="button"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => handleStatusChange("ON_HOLD")}
                    style={{ backgroundColor: colors.warning, border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", padding: `${spacing.sm}px ${spacing.md}px` }}
                    type="button"
                  >
                    Put On Hold
                  </button>
                  <ReturnTransactionDialog returnReasons={returnReasons} onReturn={handleReturn} />
                </>
              )}
              {!isLocked && (selectedItem.status === "COMPLETED" || selectedItem.status === "RETURNED") && (
                <div style={{ color: colors.muted, fontSize: typography.small }}>No actions available.</div>
              )}
              {message ? <div style={{ color: colors.muted, fontSize: typography.small }}>{message}</div> : null}
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
