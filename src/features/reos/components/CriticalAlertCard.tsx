import type { CriticalAlert } from "../types/dashboard";

type CriticalAlertCardProps = {
  alert: CriticalAlert;
  onDrillDown: (path: string) => void;
};

const severityStyles: Record<CriticalAlert["severity"], string> = {
  CRITICAL: "border-red-300 border-l-red-600 bg-red-50 text-red-900",
  WARNING: "border-amber-300 border-l-amber-600 bg-amber-50 text-amber-900",
  INFO: "border-emerald-300 border-l-emerald-600 bg-emerald-50 text-emerald-900",
};

export function CriticalAlertCard({ alert, onDrillDown }: CriticalAlertCardProps) {
  return (
    <article className={`rounded-xl border border-l-4 p-5 shadow-md shadow-slate-200/60 transition hover:shadow-lg ${severityStyles[alert.severity]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{alert.title}</h3>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{alert.count}</div>
        </div>
        <span className="rounded border border-current px-2 py-1 text-xs font-semibold">{alert.severity}</span>
      </div>
      <p className="mt-3 text-sm">{alert.decision}</p>
      <button
        className="mt-4 rounded text-sm font-semibold underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1"
        onClick={() => onDrillDown(alert.drillDownPath)}
        type="button"
      >
        {alert.drillDownLabel}
      </button>
    </article>
  );
}
