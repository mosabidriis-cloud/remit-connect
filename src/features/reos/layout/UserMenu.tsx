export function UserMenu() {
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        type="button"
      >
        <span className="grid h-7 w-7 place-items-center rounded bg-slate-100 text-xs font-semibold text-slate-700">
          OM
        </span>
        <span className="hidden lg:inline">Operations Manager</span>
      </button>
    </div>
  );
}
