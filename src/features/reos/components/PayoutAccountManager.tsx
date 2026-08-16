import { useEffect, useState } from "react";
import { DataTable } from "./common/DataTable";
import { EmptyState } from "./common/EmptyState";
import {
  addPayoutAccount,
  getPayoutAccountsByBranch,
  setPayoutAccountStatus,
  updatePayoutAccount,
} from "../services/liquidityService";
import { colors, radius, spacing, typography } from "../theme";
import type { PayoutAccount } from "../types/liquidity";

type PayoutAccountManagerProps = {
  branchId: string;
  actorUserId: string;
  /**
   * liquidityService now reads/writes Supabase-backed tables shared with the sibling
   * FundingRecorder - mutating it from here does not, by itself, trigger a re-fetch in
   * that sibling. Calling this after every write bumps a counter the parent page owns
   * and passes to both children as `refreshSignal`, so an account added here is
   * re-fetched by the funding form and vice versa.
   */
  onChange: () => void;
  refreshSignal: number;
};

type AccountFormValues = {
  bank: string;
  accountNumber: string;
  currency: string;
  minimumThreshold: string;
};

const emptyForm: AccountFormValues = { bank: "", accountNumber: "", currency: "SDG", minimumThreshold: "0" };

export function PayoutAccountManager({ branchId, actorUserId, onChange, refreshSignal }: PayoutAccountManagerProps) {
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<AccountFormValues & { openingBalance: string }>({
    ...emptyForm,
    openingBalance: "0",
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AccountFormValues>(emptyForm);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);

  useEffect(() => {
    let cancelled = false;

    getPayoutAccountsByBranch(branchId).then((nextAccounts) => {
      if (!cancelled) {
        setAccounts(nextAccounts);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [branchId, refreshSignal]);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) ?? null;

  const handleAdd = async () => {
    setError(null);

    try {
      await addPayoutAccount({
        branchId,
        bank: addForm.bank,
        accountNumber: addForm.accountNumber,
        currency: addForm.currency,
        openingBalance: Number(addForm.openingBalance) || 0,
        minimumThreshold: Number(addForm.minimumThreshold) || 0,
        actorUserId,
      });
      setAddForm({ ...emptyForm, openingBalance: "0" });
      onChange();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add payout account.");
    }
  };

  const handleSelectAccount = (account: PayoutAccount) => {
    setSelectedAccountId(account.id);
    setEditForm({
      bank: account.bank,
      accountNumber: account.accountNumber,
      currency: account.currency,
      minimumThreshold: String(account.minimumThreshold),
    });
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedAccount) {
      return;
    }

    setError(null);

    try {
      await updatePayoutAccount({
        accountId: selectedAccount.id,
        bank: editForm.bank,
        accountNumber: editForm.accountNumber,
        currency: editForm.currency,
        minimumThreshold: Number(editForm.minimumThreshold) || 0,
        actorUserId,
      });
      onChange();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update payout account.");
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedAccount) {
      return;
    }

    try {
      await setPayoutAccountStatus(
        selectedAccount.id,
        selectedAccount.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        actorUserId,
      );
      onChange();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to change account status.");
    }
  };

  return (
    <div style={{ display: "grid", gap: spacing.lg }}>
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Payout Accounts</div>
        {accounts.length === 0 ? (
          <div style={{ marginTop: spacing.md }}>
            <EmptyState message="This branch has no payout accounts yet." />
          </div>
        ) : (
          <div style={{ marginTop: spacing.md }}>
            <DataTable
              columns={[
                { key: "bank", header: "Bank", render: (a: PayoutAccount) => a.bank },
                { key: "accountNumber", header: "Account Number", render: (a: PayoutAccount) => a.accountNumber },
                { key: "currency", header: "Currency", render: (a: PayoutAccount) => a.currency },
                {
                  key: "currentBalance",
                  header: "Current Balance",
                  align: "right",
                  render: (a: PayoutAccount) => a.currentBalance.toLocaleString(),
                },
                { key: "minimumThreshold", header: "Minimum Threshold", align: "right", render: (a: PayoutAccount) => a.minimumThreshold.toLocaleString() },
                { key: "status", header: "Status", render: (a: PayoutAccount) => a.status },
                {
                  key: "select",
                  header: "",
                  render: (a: PayoutAccount) => (
                    <button
                      onClick={() => handleSelectAccount(a)}
                      style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", fontSize: typography.small, fontWeight: 600 }}
                      type="button"
                    >
                      Manage
                    </button>
                  ),
                },
              ]}
              getRowKey={(a: PayoutAccount) => a.id}
              rows={accounts}
            />
          </div>
        )}
      </div>

      {selectedAccount ? (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
          <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>
            Manage {selectedAccount.bank} - {selectedAccount.accountNumber}
          </div>
          <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: spacing.md }}>
            <TextField label="Bank" onChange={(value) => setEditForm((form) => ({ ...form, bank: value }))} value={editForm.bank} />
            <TextField label="Account Number" onChange={(value) => setEditForm((form) => ({ ...form, accountNumber: value }))} value={editForm.accountNumber} />
            <TextField label="Currency" onChange={(value) => setEditForm((form) => ({ ...form, currency: value }))} value={editForm.currency} />
            <TextField label="Minimum Threshold" onChange={(value) => setEditForm((form) => ({ ...form, minimumThreshold: value }))} type="number" value={editForm.minimumThreshold} />
          </div>
          <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.md }}>
            <button onClick={handleSaveEdit} style={primaryButtonStyle} type="button">
              Save Changes
            </button>
            <button onClick={handleToggleStatus} style={secondaryButtonStyle} type="button">
              {selectedAccount.status === "ACTIVE" ? "Disable Account" : "Enable Account"}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>Add Payout Account</div>
        <div style={{ display: "grid", gap: spacing.sm, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: spacing.md }}>
          <TextField label="Bank" onChange={(value) => setAddForm((form) => ({ ...form, bank: value }))} value={addForm.bank} />
          <TextField label="Account Number" onChange={(value) => setAddForm((form) => ({ ...form, accountNumber: value }))} value={addForm.accountNumber} />
          <TextField label="Currency" onChange={(value) => setAddForm((form) => ({ ...form, currency: value }))} value={addForm.currency} />
          <TextField label="Opening Balance" onChange={(value) => setAddForm((form) => ({ ...form, openingBalance: value }))} type="number" value={addForm.openingBalance} />
          <TextField label="Minimum Threshold" onChange={(value) => setAddForm((form) => ({ ...form, minimumThreshold: value }))} type="number" value={addForm.minimumThreshold} />
        </div>
        <div style={{ marginTop: spacing.md }}>
          <button onClick={handleAdd} style={primaryButtonStyle} type="button">
            Add Account
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: radius.sm, color: "#B91C1C", padding: spacing.md }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

const primaryButtonStyle = {
  backgroundColor: colors.primary,
  border: "none",
  borderRadius: radius.sm,
  color: colors.surface,
  cursor: "pointer",
  fontSize: typography.small,
  fontWeight: 600,
  padding: `${spacing.sm}px ${spacing.lg}px`,
} as const;

const secondaryButtonStyle = {
  backgroundColor: colors.slate100,
  border: "none",
  borderRadius: radius.sm,
  color: colors.text,
  cursor: "pointer",
  fontSize: typography.small,
  fontWeight: 600,
  padding: `${spacing.sm}px ${spacing.lg}px`,
} as const;

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
};

function TextField({ label, value, onChange, type = "text" }: TextFieldProps) {
  return (
    <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
      {label}
      <input
        onChange={(event) => onChange(event.target.value)}
        style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}
        type={type}
        value={value}
      />
    </label>
  );
}
