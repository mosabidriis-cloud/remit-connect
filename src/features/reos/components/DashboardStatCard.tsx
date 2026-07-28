import type { DashboardStat } from "../types/dashboard";

type DashboardStatCardProps = {
  stat: DashboardStat;
};

export function DashboardStatCard({ stat }: DashboardStatCardProps) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">{stat.label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</div>
      <p className="mt-1 text-sm text-slate-600">{stat.detail}</p>
    </article>
  );
}
