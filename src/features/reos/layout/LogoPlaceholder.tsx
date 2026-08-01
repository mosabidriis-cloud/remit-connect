type LogoPlaceholderProps = {
  collapsed: boolean;
};

export function LogoPlaceholder({ collapsed }: LogoPlaceholderProps) {
  return (
    <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-slate-950 text-sm font-semibold text-white shadow-sm shadow-slate-200">
        RE
      </div>
      <div
        className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed ? "w-0 opacity-0" : "w-44 opacity-100"
        }`}
      >
        <div className="truncate text-sm font-semibold text-slate-950">REOS</div>
        <div className="truncate text-xs text-slate-500">Remit Exchange Operations</div>
      </div>
    </div>
  );
}
