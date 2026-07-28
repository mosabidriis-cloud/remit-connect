import type { TodaySummaryMetric } from "../types/dashboard";

type TodaySummaryProps = {
  metrics: TodaySummaryMetric[];
};

export function TodaySummary({ metrics }: TodaySummaryProps) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">Today Summary</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <article className="rounded border border-slate-100 p-3" key={metric.label}>
            <div className="text-xs font-semibold uppercase text-slate-500">{metric.label}</div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{metric.value}</div>
            <p className="mt-1 text-sm text-slate-600">{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
