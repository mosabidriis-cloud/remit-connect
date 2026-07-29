import type { ReportCategory } from "../../types/report";

type ReportHeaderProps = {
  name: string;
  category: ReportCategory;
  businessQuestion: string;
  generatedAt: string;
};

export function ReportHeader({
  name,
  category,
  businessQuestion,
  generatedAt,
}: ReportHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
          {formatCategory(category)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">{name}</h1>
        <p className="mt-1 text-sm text-slate-600">{businessQuestion}</p>
      </div>
      <div className="text-right text-sm text-slate-600">
        <div className="font-medium text-slate-900">Generated</div>
        <div>{formatDateTime(generatedAt)}</div>
      </div>
    </header>
  );
}

function formatCategory(category: ReportCategory): string {
  return category === "VOLUME" ? "Volume Report" : "Performance Report";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
