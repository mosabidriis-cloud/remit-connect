import type { WorkQueueItem } from "../types/dashboard";

type WorkQueueTableProps = {
  items: WorkQueueItem[];
};

export function WorkQueueTable({ items }: WorkQueueTableProps) {
  return (
    <section className="rounded border border-slate-200 bg-white" id="work-queue">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-950">Work Queue</h2>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-slate-600">No urgent batch work is queued.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Queue</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.label}</td>
                  <td className="px-4 py-3 text-slate-700">{item.batchReference}</td>
                  <td className="px-4 py-3 text-slate-700">{item.branchId ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-slate-700">{formatAge(item.ageMinutes)}</td>
                  <td className="px-4 py-3 text-slate-700">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatAge(ageMinutes: number): string {
  if (ageMinutes < 60) {
    return `${ageMinutes} min`;
  }

  return `${Math.floor(ageMinutes / 60)}h ${ageMinutes % 60}m`;
}
