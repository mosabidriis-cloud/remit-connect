import { KpiCard } from "./common/KpiCard";
import type { DashboardStat } from "../types/dashboard";

type DashboardStatCardProps = {
  stat: DashboardStat;
};

export function DashboardStatCard({ stat }: DashboardStatCardProps) {
  return <KpiCard detail={stat.detail} label={stat.label} value={stat.value} />;
}
