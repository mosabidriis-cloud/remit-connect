import { useEffect, useState } from "react";
import { DataTable } from "../components/common/DataTable";
import { EmptyState } from "../components/common/EmptyState";
import { KpiCard } from "../components/common/KpiCard";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { useReosSession } from "../layout/reosAuthContext";
import { reportService } from "../services/reportService";
import type {
  LiquidityDashboard,
  LiquidityDashboardAccountRow,
  LiquidityDashboardBranchRow,
  LiquidityDashboardFundingRow,
} from "../types/liquidityDashboard";
import type { ProjectionScope } from "../types/reportingProjection";

const healthTone: Record<string, "emerald" | "amber" | "red"> = {
  GREEN: "emerald",
  YELLOW: "amber",
  RED: "red",
};

export function LiquidityDashboardPage() {
  const { session } = useReosSession();
  const [dashboard, setDashboard] = useState<LiquidityDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;
    const dashboardActor: ProjectionScope = { actorUserId: session.userId, actorRole: session.role, branchId: session.branchId };

    reportService
      .generateLiquidityDashboard(dashboardActor)
      .then((generated) => {
        if (!cancelled) {
          setDashboard(generated);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "The liquidity dashboard could not be generated.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <PageContainer>
      <PageHeader
        description="Live operational liquidity across every branch and payout account."
        title="Liquidity Dashboard"
      />

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(dashboard?.stats ?? []).map((stat) => (
          <KpiCard detail={stat.detail} key={stat.id} label={stat.label} value={stat.value} />
        ))}
      </section>

      <BranchSection branches={dashboard?.branches ?? []} />
      <AccountSection accounts={dashboard?.accounts ?? []} />
      <FundingSection fundingHistory={dashboard?.fundingHistory ?? []} />
    </PageContainer>
  );
}

function BranchSection({ branches }: { branches: LiquidityDashboardBranchRow[] }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-slate-900">Branch Liquidity</h2>
      {branches.length === 0 ? (
        <EmptyState message="No branch has any payout accounts yet." />
      ) : (
        <DataTable
          columns={[
            { key: "branchName", header: "Branch", render: (row: LiquidityDashboardBranchRow) => row.branchName },
            { key: "accountCount", header: "Accounts", render: (row: LiquidityDashboardBranchRow) => String(row.accountCount) },
            { key: "totalLiquidity", header: "Total", align: "right", render: (row: LiquidityDashboardBranchRow) => row.totalLiquidity.toLocaleString() },
            { key: "reservedLiquidity", header: "Reserved", align: "right", render: (row: LiquidityDashboardBranchRow) => row.reservedLiquidity.toLocaleString() },
            { key: "availableLiquidity", header: "Available", align: "right", render: (row: LiquidityDashboardBranchRow) => row.availableLiquidity.toLocaleString() },
            { key: "consumptionToday", header: "Consumption Today", align: "right", render: (row: LiquidityDashboardBranchRow) => row.consumptionToday.toLocaleString() },
            { key: "fundingToday", header: "Funding Today", align: "right", render: (row: LiquidityDashboardBranchRow) => row.fundingToday.toLocaleString() },
            {
              key: "health",
              header: "Health",
              render: (row: LiquidityDashboardBranchRow) => <StatusBadge label={row.health} tone={healthTone[row.health]} />,
            },
          ]}
          getRowKey={(row: LiquidityDashboardBranchRow) => row.branchId}
          rows={branches}
        />
      )}
    </section>
  );
}

function AccountSection({ accounts }: { accounts: LiquidityDashboardAccountRow[] }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-slate-900">Payout Accounts</h2>
      {accounts.length === 0 ? (
        <EmptyState message="No payout accounts have been added yet." />
      ) : (
        <DataTable
          columns={[
            { key: "branchName", header: "Branch", render: (row: LiquidityDashboardAccountRow) => row.branchName ?? row.branchId },
            { key: "bank", header: "Bank", render: (row: LiquidityDashboardAccountRow) => row.bank },
            { key: "accountNumber", header: "Account Number", render: (row: LiquidityDashboardAccountRow) => row.accountNumber },
            { key: "currency", header: "Currency", render: (row: LiquidityDashboardAccountRow) => row.currency },
            { key: "currentBalance", header: "Current Balance", align: "right", render: (row: LiquidityDashboardAccountRow) => row.currentBalance.toLocaleString() },
            { key: "reservedBalance", header: "Reserved", align: "right", render: (row: LiquidityDashboardAccountRow) => row.reservedBalance.toLocaleString() },
            { key: "availableBalance", header: "Available", align: "right", render: (row: LiquidityDashboardAccountRow) => row.availableBalance.toLocaleString() },
            { key: "minimumThreshold", header: "Minimum Threshold", align: "right", render: (row: LiquidityDashboardAccountRow) => row.minimumThreshold.toLocaleString() },
            {
              key: "health",
              header: "Health",
              render: (row: LiquidityDashboardAccountRow) => <StatusBadge label={row.health} tone={healthTone[row.health]} />,
            },
          ]}
          getRowKey={(row: LiquidityDashboardAccountRow) => row.accountId}
          rows={accounts}
        />
      )}
    </section>
  );
}

function FundingSection({ fundingHistory }: { fundingHistory: LiquidityDashboardFundingRow[] }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-slate-900">Recent Funding History</h2>
      {fundingHistory.length === 0 ? (
        <EmptyState message="No funding has been recorded yet." />
      ) : (
        <DataTable
          columns={[
            { key: "updatedAt", header: "Date", render: (row: LiquidityDashboardFundingRow) => new Date(row.updatedAt).toLocaleString() },
            { key: "branchName", header: "Branch", render: (row: LiquidityDashboardFundingRow) => row.branchName ?? "-" },
            { key: "accountCount", header: "Accounts Funded", render: (row: LiquidityDashboardFundingRow) => String(row.accountCount) },
            { key: "totalAmount", header: "Total Amount", align: "right", render: (row: LiquidityDashboardFundingRow) => row.totalAmount.toLocaleString() },
            { key: "updatedByUserId", header: "Recorded By", render: (row: LiquidityDashboardFundingRow) => row.updatedByUserId },
          ]}
          getRowKey={(row: LiquidityDashboardFundingRow) => row.fundingEventId}
          rows={fundingHistory}
        />
      )}
    </section>
  );
}
