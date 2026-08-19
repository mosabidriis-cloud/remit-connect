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
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/60" id="branch-performance">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Branch Performance</h2>
      </div>
      {branches.length === 0 ? (
        <p className="p-5 text-sm text-slate-600">No branch performance data is available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-900 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
              <tr>
                <th className="px-4 py-2.5">Branch</th>
                <th className="px-4 py-2.5 text-right">Transactions</th>
                <th className="px-4 py-2.5 text-right">USD Value</th>
                <th className="px-4 py-2.5 text-right">Revenue</th>
                <th className="px-4 py-2.5 text-right">Processing Speed</th>
                <th className="px-4 py-2.5 text-right">Errors</th>
                <th className="px-4 py-2.5 text-right">Returns</th>
                <th className="px-4 py-2.5 text-right">Current Workload</th>
                <th className="px-4 py-2.5">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {branches.map((branch) => (
                <tr className="even:bg-slate-50/60 transition-colors hover:bg-blue-50/40" key={branch.branchId}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{branch.branchName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{branch.transactions}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatCurrency(branch.usdValue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatCurrency(branch.revenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatMinutes(branch.processingSpeedMinutes)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{branch.errors}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{branch.returns}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{branch.currentWorkload}</td>
                  <td className="px-4 py-2.5">
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
