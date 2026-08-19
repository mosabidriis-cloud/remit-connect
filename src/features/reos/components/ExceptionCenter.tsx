import type { ExceptionCenterItem } from "../types/dashboard";

type ExceptionCenterProps = {
  items: ExceptionCenterItem[];
  onDrillDown: (path: string) => void;
};

export function ExceptionCenter({ items, onDrillDown }: ExceptionCenterProps) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-md shadow-slate-200/60" id="exception-center">
      <h2 className="text-base font-semibold text-slate-950">Exception Center</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <article
            className={`rounded-lg border border-l-4 bg-slate-50/60 p-4 transition hover:shadow-sm ${
              item.count > 0 ? "border-slate-200 border-l-amber-500 hover:border-slate-300" : "border-slate-200 border-l-emerald-400 hover:border-slate-300"
            }`}
            key={item.id}
          >
            <div className="text-xs font-semibold uppercase text-slate-500">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{item.count}</div>
            <p className="mt-1 min-h-10 text-sm text-slate-600">{item.decision}</p>
            <button
              className="mt-3 rounded text-sm font-medium text-blue-700 transition hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-1 disabled:text-slate-400"
              disabled={item.count === 0}
              onClick={() => onDrillDown(item.drillDownPath)}
              type="button"
            >
              Drill down
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
