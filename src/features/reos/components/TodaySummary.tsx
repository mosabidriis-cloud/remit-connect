import { colors } from "../theme";
import type { TodaySummaryMetric } from "../types/dashboard";

type TodaySummaryProps = {
  metrics: TodaySummaryMetric[];
};

/** The one anchor tile in this grid - REOS's real headline volume figure. */
const anchorMetricLabel = "SDG Processed";

export function TodaySummary({ metrics }: TodaySummaryProps) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-md shadow-slate-200/60">
      <h2 className="text-base font-semibold text-slate-950">Today Summary</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => {
          const isAnchor = metric.label === anchorMetricLabel;

          return (
            <article
              className={
                isAnchor
                  ? "rounded-lg p-4 shadow-sm transition"
                  : "rounded-lg border border-slate-200 bg-slate-50/60 p-4 transition hover:border-slate-300 hover:shadow-sm"
              }
              key={metric.label}
              style={isAnchor ? { background: colors.brandGradient } : undefined}
            >
              <div className={isAnchor ? "text-xs font-semibold uppercase text-blue-100" : "text-xs font-semibold uppercase text-slate-500"}>
                {metric.label}
              </div>
              <div className={isAnchor ? "mt-2 text-lg font-bold tabular-nums text-white" : "mt-2 text-lg font-semibold tabular-nums text-slate-950"}>
                {metric.value}
              </div>
              <p className={isAnchor ? "mt-1 text-sm text-blue-100/85" : "mt-1 text-sm text-slate-600"}>{metric.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
