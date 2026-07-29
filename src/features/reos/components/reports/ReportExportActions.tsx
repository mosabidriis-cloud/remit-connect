export function ReportExportActions() {
  return (
    <section className="flex flex-wrap items-center justify-end gap-2">
      <button
        className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled
        type="button"
      >
        Excel
      </button>
      <button
        className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled
        type="button"
      >
        PDF
      </button>
      <button
        className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled
        type="button"
      >
        Print
      </button>
    </section>
  );
}
