import type { ExceptionCenterItem } from "../types/dashboard";

type ExceptionCenterProps = {
  items: ExceptionCenterItem[];
  onDrillDown: (path: string) => void;
};

export function ExceptionCenter({ items, onDrillDown }: ExceptionCenterProps) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4" id="exception-center">
      <h2 className="text-base font-semibold text-slate-950">Exception Center</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <article className="rounded border border-slate-200 p-3" key={item.id}>
            <div className="text-xs font-semibold uppercase text-slate-500">{item.label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{item.count}</div>
            <p className="mt-1 min-h-10 text-sm text-slate-600">{item.decision}</p>
            <button
              className="mt-3 text-sm font-medium text-blue-700 disabled:text-slate-400"
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
