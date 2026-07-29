import type { ReportMetric } from "../../types/report";

type ReportSummaryProps = {
  metrics: ReportMetric[];
};

export function ReportSummary({ metrics }: ReportSummaryProps) {
  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-950">Summary</h2>
      </div>
      {metrics.length === 0 ? (
        <p className="p-4 text-sm text-slate-600">
          No summary metrics are available until a report is registered.
        </p>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div className="rounded border border-slate-200 p-3" key={metric.label}>
              <div className="text-xs font-medium uppercase tracking-normal text-slate-500">
                {metric.label}
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-950">
                {metric.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
