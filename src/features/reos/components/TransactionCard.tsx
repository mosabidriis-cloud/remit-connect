import type { CreditToAccountTransaction } from "../types/transactionProcessing";

type TransactionCardProps = {
  transaction: CreditToAccountTransaction;
};

export function TransactionCard({ transaction }: TransactionCardProps) {
  const beneficiary = transaction.beneficiary;

  return (
    <div className="grid gap-4 rounded border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase text-slate-500">Direct Remit Reference</span>
          <h1 className="text-2xl font-semibold text-slate-950">{beneficiary.directRemitReference}</h1>
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{transaction.status}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
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
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-950">{value}</span>
    </div>
  );
}
