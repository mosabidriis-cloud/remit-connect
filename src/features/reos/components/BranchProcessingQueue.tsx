import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./common/StatusBadge";
import { BranchProcessingCompletionDialog } from "./BranchProcessingCompletionDialog";
import { ProofGallery } from "./ProofGallery";
import { ProofUpload } from "./ProofUpload";
import { ReturnTransactionDialog } from "./ReturnTransactionDialog";
import { colors, radius, spacing, typography } from "../theme";
import { getPayoutAccountsByBranch } from "../services/liquidityService";
import { getActiveReturnReasons } from "../services/transactionProcessingService";
import type { Assignment } from "../types/assignment";
import type { PayoutAccount } from "../types/liquidity";
import {
  addProofToBranchProcessingQueueItem,
  completeBranchProcessingQueueItem,
  finalizeBranchProcessing,
  getBranchProcessingQueue,
  getBranchProcessingQueueSummary,
  getBranchProcessingStatus,
  getReservedAmountForAccount,
  hydrateBranchProcessingQueue,
  isBranchProcessingComplete,
  returnBranchProcessingQueueItem,
  startBranchProcessingQueueItem,
  type BranchProcessingQueueItem,
  type BranchProcessingQueueStatus,
  type BranchProcessingQueueSummary,
  type BranchProcessingStatus,
  updateBranchProcessingQueueItemStatus,
} from "../services/branchProcessingQueueService";

const emptySummary: BranchProcessingQueueSummary = {
  assigned: 0,
  inProgress: 0,
  completed: 0,
  onHold: 0,
  returned: 0,
  remaining: 0,
  total: 0,
  completionPercentage: 0,
};

type BranchProcessingQueueProps = {
  actorUserId: string;
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

export function BranchProcessingQueue({ actorUserId, assignments, branchId, branchName }: BranchProcessingQueueProps) {
  const [queueItems, setQueueItems] = useState<BranchProcessingQueueItem[]>(() => []);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [branchStatus, setBranchStatus] = useState<BranchProcessingStatus>("PROCESSING");
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPayoutAccountId, setSelectedPayoutAccountId] = useState<string>("");
  const [summary, setSummary] = useState<BranchProcessingQueueSummary>(emptySummary);
  const [canFinalize, setCanFinalize] = useState(false);
  const [eligiblePayoutAccounts, setEligiblePayoutAccounts] = useState<PayoutAccount[]>([]);
  const [branchPayoutAccountCount, setBranchPayoutAccountCount] = useState<number | null>(null);
  const [selectedPayoutAccount, setSelectedPayoutAccount] = useState<PayoutAccount | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const nextItems = await hydrateBranchProcessingQueue(branchId, assignments);
      const status = await getBranchProcessingStatus(branchId);

      if (!cancelled) {
        setQueueItems(nextItems);
        setSelectedItemId(nextItems[0]?.id ?? null);
        setBranchStatus(status);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assignments, branchId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [summaryValue, complete] = await Promise.all([
        getBranchProcessingQueueSummary(branchId),
        isBranchProcessingComplete(branchId),
      ]);

      if (!cancelled) {
        setSummary(summaryValue);
        setCanFinalize(complete);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, queueItems]);

  const returnReasons = useMemo(() => getActiveReturnReasons(), []);

  const isLocked = branchStatus === "COMPLETED";
  const selectedItem = queueItems.find((item) => item.id === selectedItemId) ?? null;
  const canComplete = Boolean(selectedItem && selectedItem.status === "IN_PROGRESS" && selectedItem.proofs.length > 0);

  // Payout accounts with enough available balance (current minus already-reserved,
  // LIQUIDITY_MANAGEMENT.md Section 7.2) to cover this transaction. Only relevant the
  // first time a transaction starts - resuming from ON_HOLD reuses the account already
  // chosen and needs no picker.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Deferred past the current synchronous effect tick on every path (including the
      // early-exit below) so no setState call here ever runs synchronously within the
      // effect body itself.
      await Promise.resolve();

      if (!selectedItem || selectedItem.payoutAccountId !== null) {
        if (!cancelled) {
          setEligiblePayoutAccounts([]);
          setBranchPayoutAccountCount(null);
        }
        return;
      }

      const branchAccounts = await getPayoutAccountsByBranch(branchId);
      const activeAccounts = branchAccounts.filter(
        (account) => account.status === "ACTIVE" && account.currency === selectedItem.beneficiary.currency,
      );
      const eligible: PayoutAccount[] = [];

      for (const account of activeAccounts) {
        const reserved = await getReservedAmountForAccount(account.id);
        const available = account.currentBalance - reserved;

        if (available >= selectedItem.beneficiary.amount) {
          eligible.push(account);
        }
      }

      if (!cancelled) {
        setEligiblePayoutAccounts(eligible);
        setBranchPayoutAccountCount(branchAccounts.length);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, selectedItem, queueItems]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // See the eligiblePayoutAccounts effect above for why every path defers past an
      // await before calling setState, including this early exit.
      await Promise.resolve();

      if (!selectedItem?.payoutAccountId) {
        if (!cancelled) {
          setSelectedPayoutAccount(null);
        }
        return;
      }

      const accounts = await getPayoutAccountsByBranch(branchId);

      if (!cancelled) {
        setSelectedPayoutAccount(accounts.find((account) => account.id === selectedItem.payoutAccountId) ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, selectedItem]);

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedPayoutAccountId("");
    setMessage(null);
  };

  const refreshQueueItems = async () => {
    setQueueItems(await getBranchProcessingQueue(branchId));
  };

  const handleStatusChange = async (status: BranchProcessingQueueStatus) => {
    if (!selectedItem || isLocked) {
      return;
    }

    await updateBranchProcessingQueueItemStatus(selectedItem.id, status, actorUserId);
    await refreshQueueItems();
  };

  const handleStartProcessing = async () => {
    if (!selectedItem || isLocked) {
      return;
    }

    try {
      await startBranchProcessingQueueItem(selectedItem.id, selectedPayoutAccountId || undefined, actorUserId);
      setSelectedPayoutAccountId("");
      await refreshQueueItems();
      setMessage(null);
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to start processing.");
    }
  };

  const handleProofUpload = async (files: File[]) => {
    if (!selectedItem) {
      return;
    }

    try {
      for (const file of files) {
        await addProofToBranchProcessingQueueItem(selectedItem.id, file, actorUserId);
      }

      await refreshQueueItems();
      setMessage(null);
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to upload proof.");
    }
  };

  const handleComplete = async () => {
    if (!selectedItem) {
      return;
    }

    try {
      await completeBranchProcessingQueueItem(selectedItem.id, actorUserId);
      await refreshQueueItems();
      setMessage("Transaction completed.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to complete transaction.");
    }
  };

  const handleReturn = async (returnReasonId: string, comment: string) => {
    if (!selectedItem) {
      return;
    }

    const returnReason = returnReasons.find((reason) => reason.id === returnReasonId);

    if (!returnReason) {
      setMessage("A predefined Return Reason is required.");
      return;
    }

    try {
      await returnBranchProcessingQueueItem(selectedItem.id, returnReason, comment, actorUserId);
      await refreshQueueItems();
      setMessage("Transaction returned.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to return transaction.");
    }
  };

  const handleConfirmFinalize = async () => {
    const result = await finalizeBranchProcessing(branchId, actorUserId);

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
            {selectedPayoutAccount ? (
              <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                Payout Account: {selectedPayoutAccount.bank} - {selectedPayoutAccount.accountNumber} ({selectedPayoutAccount.currency})
              </div>
            ) : null}

            <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.lg }}>
              {isLocked && <LockedQueueNotice />}
              {!isLocked && selectedItem.status === "ASSIGNED" && (
                <>
                  <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
                    Payout Account
                    <select
                      onChange={(event) => setSelectedPayoutAccountId(event.target.value)}
                      style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}
                      value={selectedPayoutAccountId}
                    >
                      <option value="">Select a payout account...</option>
                      {eligiblePayoutAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.bank} - {account.accountNumber} ({account.currency} {account.currentBalance.toLocaleString()} available)
                        </option>
                      ))}
                    </select>
                  </label>
                  {eligiblePayoutAccounts.length === 0 ? (
                    <div style={{ color: colors.muted, fontSize: typography.small }}>
                      {branchPayoutAccountCount === 0
                        ? `${branchName} has no payout accounts on file. An Operations Manager must add one in Liquidity Management before transactions can be processed.`
                        : `No active ${selectedItem.beneficiary.currency} payout account has enough available balance for this transaction.`}
                    </div>
                  ) : null}
                  <button
                    disabled={!selectedPayoutAccountId}
                    onClick={handleStartProcessing}
                    style={{
                      backgroundColor: selectedPayoutAccountId ? colors.primary : colors.slate200,
                      border: "none",
                      borderRadius: radius.sm,
                      color: selectedPayoutAccountId ? colors.surface : colors.muted,
                      cursor: selectedPayoutAccountId ? "pointer" : "not-allowed",
                      padding: `${spacing.sm}px ${spacing.md}px`,
                    }}
                    type="button"
                  >
                    Start Processing
                  </button>
                </>
              )}
              {!isLocked && selectedItem.status === "ON_HOLD" && (
                <button
                  onClick={handleStartProcessing}
                  style={{ backgroundColor: colors.primary, border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", padding: `${spacing.sm}px ${spacing.md}px` }}
                  type="button"
                >
                  Resume Processing
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
