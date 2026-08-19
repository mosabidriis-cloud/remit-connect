import type { Beneficiary } from "../types/beneficiary";

type BeneficiaryImportTableProps = {
  beneficiaries: Beneficiary[];
};

export function BeneficiaryImportTable({ beneficiaries }: BeneficiaryImportTableProps) {
  if (beneficiaries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 text-sm text-slate-600 shadow-sm shadow-slate-200/50">
        No beneficiary records have been parsed.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-900 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
          <tr>
            <th className="px-4 py-2.5">Direct Remit Reference</th>
            <th className="px-4 py-2.5">Transaction Date</th>
            <th className="px-4 py-2.5">Beneficiary</th>
            <th className="px-4 py-2.5 text-right">Amount</th>
            <th className="px-4 py-2.5">Destination</th>
            <th className="px-4 py-2.5">Bank Name</th>
            <th className="px-4 py-2.5">Account Number</th>
            <th className="px-4 py-2.5">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {beneficiaries.map((beneficiary) => (
            <tr className="even:bg-slate-50/60 transition-colors hover:bg-blue-50/40" key={beneficiary.id}>
              <td className="px-4 py-2.5 font-medium text-slate-900">{beneficiary.directRemitReference}</td>
              <td className="px-4 py-2.5 text-slate-700">{beneficiary.transactionDate}</td>
              <td className="px-4 py-2.5 text-slate-700">{beneficiary.beneficiaryName}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                {beneficiary.currency} {beneficiary.amount.toFixed(2)}
              </td>
              <td className="px-4 py-2.5 text-slate-700">{beneficiary.destinationCountry}</td>
              <td className="px-4 py-2.5 text-slate-700">{beneficiary.bankName}</td>
              <td className="px-4 py-2.5 text-slate-700">{beneficiary.accountNumber}</td>
              <td className="px-4 py-2.5">
                {beneficiary.manualReviewRequired ? (
                  <span className="inline-flex rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    Manual review
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">None</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
