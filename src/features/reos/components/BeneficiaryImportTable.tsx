import type { Beneficiary } from "../types/beneficiary";

type BeneficiaryImportTableProps = {
  beneficiaries: Beneficiary[];
};

export function BeneficiaryImportTable({ beneficiaries }: BeneficiaryImportTableProps) {
  if (beneficiaries.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No beneficiary records have been parsed.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
          <tr>
            <th className="px-4 py-3">Direct Remit Reference</th>
            <th className="px-4 py-3">Transaction Date</th>
            <th className="px-4 py-3">Beneficiary</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Destination</th>
            <th className="px-4 py-3">Bank Name</th>
            <th className="px-4 py-3">Account Number</th>
            <th className="px-4 py-3">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {beneficiaries.map((beneficiary) => (
            <tr key={beneficiary.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{beneficiary.directRemitReference}</td>
              <td className="px-4 py-3 text-slate-700">{beneficiary.transactionDate}</td>
              <td className="px-4 py-3 text-slate-700">{beneficiary.beneficiaryName}</td>
              <td className="px-4 py-3 text-slate-700">
                {beneficiary.currency} {beneficiary.amount.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-slate-700">{beneficiary.destinationCountry}</td>
              <td className="px-4 py-3 text-slate-700">{beneficiary.bankName}</td>
              <td className="px-4 py-3 text-slate-700">{beneficiary.accountNumber}</td>
              <td className="px-4 py-3">
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
