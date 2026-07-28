import type { BranchHealth, BranchPerformanceRow } from "../types/dashboard";

type BranchPerformanceTableProps = {
  branches: BranchPerformanceRow[];
};

const healthStyles: Record<BranchHealth, string> = {
  GREEN: "border-emerald-200 bg-emerald-50 text-emerald-700",
  YELLOW: "border-amber-200 bg-amber-50 text-amber-700",
  RED: "border-red-200 bg-red-50 text-red-700",
};

export function BranchPerformanceTable({ branches }: BranchPerformanceTableProps) {
  return (
    <section className="rounded border border-slate-200 bg-white" id="branch-performance">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-950">Branch Performance</h2>
      </div>
      {branches.length === 0 ? (
        <p className="p-4 text-sm text-slate-600">No branch performance data is available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Transactions</th>
                <th className="px-4 py-3">USD Value</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Processing Speed</th>
                <th className="px-4 py-3">Errors</th>
                <th className="px-4 py-3">Returns</th>
                <th className="px-4 py-3">Current Workload</th>
                <th className="px-4 py-3">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr key={branch.branchId}>
                  <td className="px-4 py-3 font-medium text-slate-900">{branch.branchName}</td>
                  <td className="px-4 py-3 text-slate-700">{branch.transactions}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(branch.usdValue)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(branch.revenue)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMinutes(branch.processingSpeedMinutes)}</td>
                  <td className="px-4 py-3 text-slate-700">{branch.errors}</td>
                  <td className="px-4 py-3 text-slate-700">{branch.returns}</td>
                  <td className="px-4 py-3 text-slate-700">{branch.currentWorkload}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${healthStyles[branch.health]}`}>
                      {branch.health}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMinutes(value: number | null): string {
  return value === null ? "No data" : `${Math.round(value)} min`;
}
