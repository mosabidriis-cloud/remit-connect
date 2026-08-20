import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./common/StatusBadge";
import { BranchProcessingCompletionDialog } from "./BranchProcessingCompletionDialog";
import { HoldTransactionDialog } from "./HoldTransactionDialog";
import { ProofGallery } from "./ProofGallery";
import { ProofUpload } from "./ProofUpload";
import { ReturnTransactionDialog } from "./ReturnTransactionDialog";
import { useReosSession } from "../layout/reosAuthContext";
import { colors, radius, shadows, spacing, typography } from "../theme";
import { cancelBatchRequest, createBatchRequest, getOpenBatchRequestForBranch } from "../services/batchRequestService";
import { getPayoutAccountsByBranch } from "../services/liquidityService";
import { getActiveHoldReasons, getActiveReturnReasons } from "../services/transactionProcessingService";
import type { Assignment } from "../types/assignment";
import type { BatchRequest } from "../types/batchRequest";
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
  putBranchProcessingQueueItemOnHold,
  returnBranchProcessingQueueItem,
  startBranchProcessingQueueItem,
  type BranchProcessingQueueItem,
  type BranchProcessingQueueStatus,
  type BranchProcessingQueueSummary,
  type BranchProcessingStatus,
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

const chipToneColor: Record<"blue" | "amber" | "red" | "emerald" | "slate", string> = {
  blue: colors.primary,
  amber: colors.warning,
  red: colors.danger,
  emerald: colors.success,
  slate: colors.slate300,
};

type QueueStatChipProps = {
  label: string;
  value: number;
  tone: "blue" | "amber" | "red" | "emerald" | "slate";
};

/** A colored left-accent chip (mirrors the Exception Center / Import Intelligence attention-tile language) instead of a flat bordered box - the accent tells you at a glance whether a number needs attention. */
function QueueStatChip({ label, value, tone }: QueueStatChipProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderLeft: `4px solid ${chipToneColor[tone]}`,
        borderRadius: radius.sm,
        padding: `${spacing.sm}px ${spacing.md}px`,
      }}
    >
      <div style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: colors.text, fontSize: typography.h2, fontVariantNumeric: "tabular-nums", fontWeight: 700, marginTop: spacing.xs }}>{value}</div>
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
  const { session } = useReosSession();
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
  const [openBatchRequest, setOpenBatchRequest] = useState<BatchRequest | null>(null);
  const [isRequestingBatch, setIsRequestingBatch] = useState(false);
  const [showRequestNoteField, setShowRequestNoteField] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [requestError, setRequestError] = useState<string | null>(null);

  // "Request a Batch" (DEC-033) - Branch Officer only, so this stays inert (harmless
  // empty state) for an Operations Manager viewing the same page for another branch.
  useEffect(() => {
    if (session?.role !== "BRANCH_OFFICER") {
      return;
    }

    let cancelled = false;

    getOpenBatchRequestForBranch(branchId)
      .then((request) => {
        if (!cancelled) {
          setOpenBatchRequest(request);
        }
      })
      .catch((cause: unknown) => {
        console.error("Unable to load open batch request:", cause);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId, session?.role]);

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
  const holdReasons = useMemo(() => getActiveHoldReasons(), []);

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

  const handlePutOnHold = async (holdReasonId: string, comment: string) => {
    if (!selectedItem || isLocked) {
      return;
    }

    const holdReason = holdReasons.find((reason) => reason.id === holdReasonId);

    if (!holdReason) {
      setMessage("A predefined Hold Reason is required.");
      return;
    }

    try {
      await putBranchProcessingQueueItemOnHold(selectedItem.id, holdReason, comment, actorUserId);
      await refreshQueueItems();
      setMessage("Transaction put on hold.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to put transaction on hold.");
    }
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

  const handleSubmitBatchRequest = async () => {
    setIsRequestingBatch(true);
    setRequestError(null);

    try {
      const request = await createBatchRequest({ branchId, requestedByUserId: actorUserId, note: requestNote.trim() || null });
      setOpenBatchRequest(request);
      setShowRequestNoteField(false);
      setRequestNote("");
    } catch (caughtError) {
      setRequestError(caughtError instanceof Error ? caughtError.message : "Unable to send this request.");
    } finally {
      setIsRequestingBatch(false);
    }
  };

  const handleCancelBatchRequest = async () => {
    if (!openBatchRequest) {
      return;
    }

    setIsRequestingBatch(true);
    setRequestError(null);

    try {
      await cancelBatchRequest(openBatchRequest.id, actorUserId);
      setOpenBatchRequest(null);
    } catch (caughtError) {
      setRequestError(caughtError instanceof Error ? caughtError.message : "Unable to cancel this request.");
    } finally {
      setIsRequestingBatch(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: spacing.lg, gridTemplateColumns: "1.7fr 1fr" }}>
      <div>
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.sm, padding: spacing.lg }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>{branchName}</div>
            <StatusBadge label={isLocked ? "COMPLETED" : "PROCESSING"} tone={isLocked ? "emerald" : "blue"} />
          </div>

          <div style={{ marginTop: spacing.md }}>
            <div style={{ alignItems: "baseline", display: "flex", justifyContent: "space-between" }}>
              <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>
                {summary.completed} of {summary.total} transactions completed
              </div>
              <div style={{ color: colors.muted, fontSize: typography.caption, fontVariantNumeric: "tabular-nums" }}>{summary.completionPercentage}%</div>
            </div>
            <div style={{ backgroundColor: colors.slate200, borderRadius: radius.sm, height: 8, marginTop: spacing.xs, overflow: "hidden", width: "100%" }}>
              <div style={{ backgroundColor: colors.success, borderRadius: radius.sm, height: "100%", transition: "width 300ms ease", width: `${summary.completionPercentage}%` }} />
            </div>
          </div>

          <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginTop: spacing.lg }}>
            <QueueStatChip label="Assigned" tone="blue" value={summary.assigned} />
            <QueueStatChip label="In Progress" tone="blue" value={summary.inProgress} />
            <QueueStatChip label="On Hold" tone="amber" value={summary.onHold} />
            <QueueStatChip label="Returned" tone="red" value={summary.returned} />
            <QueueStatChip label="Remaining" tone={summary.remaining === 0 ? "emerald" : "slate"} value={summary.remaining} />
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

        {!isLocked && session?.role === "BRANCH_OFFICER" ? (
          <div
            style={{
              backgroundColor: colors.amber50,
              border: `1px solid ${colors.border}`,
              borderLeft: `4px solid ${colors.warning}`,
              borderRadius: radius.lg,
              boxShadow: shadows.sm,
              marginTop: spacing.lg,
              padding: spacing.lg,
            }}
          >
            {openBatchRequest ? (
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Batch request sent</div>
                  <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                    Waiting on Direct Remit ({formatRelativeTime(openBatchRequest.createdAt)}).
                  </div>
                </div>
                <button
                  disabled={isRequestingBatch}
                  onClick={() => void handleCancelBatchRequest()}
                  style={{
                    background: "none",
                    border: "none",
                    color: colors.primary,
                    cursor: isRequestingBatch ? "not-allowed" : "pointer",
                    fontSize: typography.small,
                    fontWeight: 600,
                    padding: 0,
                  }}
                  type="button"
                >
                  Cancel request
                </button>
              </div>
            ) : showRequestNoteField ? (
              <div style={{ display: "grid", gap: spacing.sm }}>
                <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Request a Batch</div>
                <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
                  Note for Direct Remit (optional)
                  <textarea
                    onChange={(event) => setRequestNote(event.target.value)}
                    placeholder="e.g. Queue is empty, ready for more transactions"
                    rows={2}
                    style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.sm, resize: "vertical" }}
                    value={requestNote}
                  />
                </label>
                <div style={{ display: "flex", gap: spacing.sm }}>
                  <button
                    disabled={isRequestingBatch}
                    onClick={() => void handleSubmitBatchRequest()}
                    style={{
                      backgroundColor: colors.primary,
                      border: "none",
                      borderRadius: radius.sm,
                      color: colors.surface,
                      cursor: isRequestingBatch ? "not-allowed" : "pointer",
                      padding: `${spacing.sm}px ${spacing.md}px`,
                    }}
                    type="button"
                  >
                    {isRequestingBatch ? "Sending..." : "Send Request"}
                  </button>
                  <button
                    disabled={isRequestingBatch}
                    onClick={() => {
                      setShowRequestNoteField(false);
                      setRequestNote("");
                    }}
                    style={{
                      backgroundColor: "transparent",
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.sm,
                      color: colors.text,
                      cursor: isRequestingBatch ? "not-allowed" : "pointer",
                      padding: `${spacing.sm}px ${spacing.md}px`,
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>
                    {summary.remaining === 0 ? "Queue is empty" : "Need more work?"}
                  </div>
                  <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                    {summary.remaining === 0
                      ? `Let Direct Remit know ${branchName} is ready for more transactions.`
                      : `Ask Direct Remit to queue up another batch for ${branchName}, even while ${summary.remaining} transaction${summary.remaining === 1 ? "" : "s"} are still in progress.`}
                  </div>
                </div>
                <button
                  onClick={() => setShowRequestNoteField(true)}
                  style={{
                    backgroundColor: colors.warning,
                    border: "none",
                    borderRadius: radius.sm,
                    color: colors.surface,
                    cursor: "pointer",
                    fontWeight: 600,
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    whiteSpace: "nowrap",
                  }}
                  type="button"
                >
                  Request a Batch
                </button>
              </div>
            )}
            {requestError ? <div style={{ color: colors.danger, fontSize: typography.small, marginTop: spacing.sm }}>{requestError}</div> : null}
          </div>
        ) : null}

        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.sm, marginTop: spacing.lg, padding: spacing.lg }}>
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

      <div
        className="sticky top-20 self-start"
        style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.lg, boxShadow: shadows.sm, padding: spacing.lg }}
      >
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
                <>
                  <div style={{ backgroundColor: colors.amber50, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.warning}`, borderRadius: radius.sm, padding: spacing.md }}>
                    <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>
                      {selectedItem.holdReason?.name ?? "On hold"}
                    </div>
                    {selectedItem.holdComment ? (
                      <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>{selectedItem.holdComment}</div>
                    ) : null}
                  </div>
                  <button
                    onClick={handleStartProcessing}
                    style={{ backgroundColor: colors.primary, border: "none", borderRadius: radius.sm, color: colors.surface, cursor: "pointer", marginTop: spacing.sm, padding: `${spacing.sm}px ${spacing.md}px` }}
                    type="button"
                  >
                    Resume Processing
                  </button>
                </>
              )}
              {!isLocked && selectedItem.status === "IN_PROGRESS" && (
                <>
                  <ProofUpload onUpload={handleProofUpload} />

                  {/* Actions sit right after the uploader, not below the gallery below -
                      once a proof image is attached, the gallery can push Complete well
                      past the fold, forcing a scroll just to finish the transaction. */}
                  <button
                    disabled={!canComplete}
                    onClick={handleComplete}
                    style={{
                      backgroundColor: canComplete ? colors.primary : colors.slate200,
                      border: "none",
                      borderRadius: radius.sm,
                      color: canComplete ? colors.surface : colors.muted,
                      cursor: canComplete ? "pointer" : "not-allowed",
                      fontWeight: 600,
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      width: "100%",
                    }}
                    type="button"
                  >
                    Complete
                  </button>
                  {!canComplete ? (
                    <div style={{ color: colors.muted, fontSize: typography.caption }}>Attach at least one proof image before completing.</div>
                  ) : null}

                  <HoldTransactionDialog holdReasons={holdReasons} onHold={handlePutOnHold} />
                  <ReturnTransactionDialog returnReasons={returnReasons} onReturn={handleReturn} />

                  <div style={{ borderTop: `1px solid ${colors.slate100}`, paddingTop: spacing.md }}>
                    <ProofGallery proofs={selectedItem.proofs} />
                  </div>
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

function formatRelativeTime(value: string): string {
  const elapsedMs = Date.now() - new Date(value).getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  if (elapsedMinutes < 1) {
    return "just now";
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays}d ago`;
}
