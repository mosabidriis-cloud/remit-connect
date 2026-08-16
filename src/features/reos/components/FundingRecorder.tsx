import { useEffect, useState } from "react";
import { DataTable } from "./common/DataTable";
import { EmptyState } from "./common/EmptyState";
import { getFundingEventsByBranch, getPayoutAccountsByBranch, recordFunding } from "../services/liquidityService";
import { colors, radius, spacing, typography } from "../theme";
import type { FundingEvent, PayoutAccount } from "../types/liquidity";

type FundingRecorderProps = {
  branchId: string;
  actorUserId: string;
  /** Shared with the sibling PayoutAccountManager - see its onChange doc comment. */
  onChange: () => void;
  refreshSignal: number;
};

/**
 * Manual funding, no approval (LIQUIDITY_MANAGEMENT.md Section 7.3): select accounts,
 * enter an amount for each, submit. No pending state, no treasury queue.
 */
export function FundingRecorder({ branchId, actorUserId, onChange, refreshSignal }: FundingRecorderProps) {
  const [error, setError] = useState<string | null>(null);
  const [amountsByAccountId, setAmountsByAccountId] = useState<Record<string, string>>({});
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [history, setHistory] = useState<FundingEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPayoutAccountsByBranch(branchId), getFundingEventsByBranch(branchId)]).then(
      ([nextAccounts, nextHistory]) => {
        if (!cancelled) {
          setAccounts(nextAccounts.filter((account) => account.status === "ACTIVE"));
          setHistory([...nextHistory].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)));
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [branchId, refreshSignal]);

  const handleAmountChange = (accountId: string, value: string) => {
    setAmountsByAccountId((current) => ({ ...current, [accountId]: value }));
  };

  const handleSubmit = async () => {
    setError(null);

    const entries = Object.entries(amountsByAccountId)
      .map(([accountId, amount]) => ({ accountId, amount: Number(amount) }))
      .filter((entry) => entry.amount > 0);

    try {
      await recordFunding({ branchId, entries, actorUserId, reference, notes });
      setAmountsByAccountId({});
      setReference("");
      setNotes("");
      onChange();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to record funding.");
    }
  };

  return (
    <div style={{ display: "grid", gap: spacing.lg }}>
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Record Funding Received</div>
        <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
          Funding happens outside REOS - this records that it already arrived. No approval, no pending state.
        </p>
        {accounts.length === 0 ? (
          <div style={{ marginTop: spacing.md }}>
            <EmptyState message="This branch has no active payout accounts to fund." />
          </div>
        ) : (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
            {accounts.map((account: PayoutAccount) => (
              <div key={account.id} style={{ alignItems: "center", display: "flex", gap: spacing.md }}>
                <div style={{ color: colors.text, flex: 1, fontSize: typography.small }}>
                  {account.bank} - {account.accountNumber} ({account.currency}) - current {account.currentBalance.toLocaleString()}
                </div>
                <input
                  min={0}
                  onChange={(event) => handleAmountChange(account.id, event.target.value)}
                  placeholder="Amount received"
                  style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px`, width: 180 }}
                  type="number"
                  value={amountsByAccountId[account.id] ?? ""}
                />
              </div>
            ))}
            <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "1fr 1fr", marginTop: spacing.sm }}>
              <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
                Reference (optional)
                <input
                  onChange={(event) => setReference(event.target.value)}
                  style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}
                  value={reference}
                />
              </label>
              <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
                Notes (optional)
                <input
                  onChange={(event) => setNotes(event.target.value)}
                  style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}
                  value={notes}
                />
              </label>
            </div>
            <div>
              <button
                onClick={handleSubmit}
                style={{
                  backgroundColor: colors.primary,
                  border: "none",
                  borderRadius: radius.sm,
                  color: colors.surface,
                  cursor: "pointer",
                  fontSize: typography.small,
                  fontWeight: 600,
                  padding: `${spacing.sm}px ${spacing.lg}px`,
                }}
                type="button"
              >
                Record Funding
              </button>
            </div>
          </div>
        )}
        {error ? (
          <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: radius.sm, color: "#B91C1C", marginTop: spacing.md, padding: spacing.md }}>
            {error}
          </div>
        ) : null}
      </div>

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Funding History</div>
        {history.length === 0 ? (
          <div style={{ marginTop: spacing.md }}>
            <EmptyState message="No funding has been recorded for this branch yet." />
          </div>
        ) : (
          <div style={{ marginTop: spacing.md }}>
            <DataTable
              columns={[
                { key: "updatedAt", header: "Date", render: (event: FundingEvent) => new Date(event.updatedAt).toLocaleString() },
                { key: "accounts", header: "Accounts Funded", render: (event: FundingEvent) => String(event.entries.length) },
                { key: "totalAmount", header: "Total Amount", align: "right", render: (event: FundingEvent) => event.totalAmount.toLocaleString() },
                { key: "reference", header: "Reference", render: (event: FundingEvent) => event.reference ?? "-" },
                { key: "updatedBy", header: "Recorded By", render: (event: FundingEvent) => event.updatedByUserId },
              ]}
              getRowKey={(event: FundingEvent) => event.id}
              rows={history}
            />
          </div>
        )}
      </div>
    </div>
  );
}
