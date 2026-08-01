import { StatusBadge } from "./common/StatusBadge";
import { colors, radius, spacing, typography } from "../theme";
import type { CreditToAccountTransaction, CreditToAccountTransactionStatus } from "../types/transactionProcessing";

type TransactionCardProps = {
  transaction: CreditToAccountTransaction;
};

const statusTone: Record<CreditToAccountTransactionStatus, "blue" | "emerald" | "red"> = {
  PENDING: "blue",
  COMPLETED: "emerald",
  RETURNED: "red",
};

export function TransactionCard({ transaction }: TransactionCardProps) {
  const beneficiary = transaction.beneficiary;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        display: "grid",
        gap: spacing.lg,
        padding: spacing.xl,
      }}
    >
      <div style={{ alignItems: "flex-start", display: "flex", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" }}>
        <div>
          <span style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>
            Direct Remit Reference
          </span>
          <h1 style={{ color: colors.text, fontSize: typography.h1, fontWeight: 600 }}>{beneficiary.directRemitReference}</h1>
        </div>
        <StatusBadge label={transaction.status} tone={statusTone[transaction.status]} />
      </div>
      <div style={{ display: "grid", gap: spacing.lg, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <ReadOnlyField label="Beneficiary" value={beneficiary.beneficiaryName} />
        <ReadOnlyField label="Bank" value={beneficiary.bankName} />
        <ReadOnlyField label="Account Number" value={beneficiary.accountNumber} />
        <ReadOnlyField label="Currency" value={beneficiary.currency} />
        <ReadOnlyField label="Amount" value={beneficiary.amount.toFixed(2)} />
        <ReadOnlyField label="Transaction Date" value={beneficiary.transactionDate} />
      </div>
    </div>
  );
}

type ReadOnlyFieldProps = {
  label: string;
  value: string;
};

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div style={{ display: "grid", gap: spacing.xs }}>
      <span style={{ color: colors.muted, fontSize: typography.caption, fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
      <span style={{ color: colors.text, fontSize: typography.small, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
