import type { ProofDownloadHistoryEntry } from "../types/proofDownload";

type DownloadHistoryProps = {
  history: ProofDownloadHistoryEntry[];
};

export function DownloadHistory({ history }: DownloadHistoryProps) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">Download History</h2>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No proof download activity recorded for this session.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {history.map((entry) => (
            <li className="rounded border border-slate-100 p-3 text-sm text-slate-700" key={entry.id}>
              <div className="font-medium text-slate-900">{entry.details}</div>
              <div className="mt-1 text-xs text-slate-500">
                {entry.performedByUserId} at {formatDateTime(entry.performedAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
