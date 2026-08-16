import type {
  LiquidityDashboard,
  LiquidityDashboardAccountRow,
  LiquidityDashboardBranchRow,
  LiquidityDashboardFundingRow,
  LiquidityDashboardStat,
} from "../types/liquidityDashboard";
import type {
  FundingEventProjection,
  LiquidityAccountProjection,
  LiquidityBranchProjection,
} from "../types/reportingProjection";

/**
 * Liquidity Dashboard assembly (LIQUIDITY_MANAGEMENT.md Section 10). Mirrors
 * dashboardService.buildOperationsDashboard's existing shape: a pure function from
 * projections to a view model, no store access of its own, nothing recomputed that the
 * projection layer already computed.
 */
export interface LiquidityDashboardProjections {
  branches: readonly LiquidityBranchProjection[];
  accounts: readonly LiquidityAccountProjection[];
  fundingEvents: readonly FundingEventProjection[];
  now?: Date;
}

export function buildLiquidityDashboard(projections: LiquidityDashboardProjections): LiquidityDashboard {
  const now = projections.now ?? new Date();
  const branches = projections.branches ?? [];
  const accounts = projections.accounts ?? [];
  const fundingEvents = projections.fundingEvents ?? [];

  const branchRows: LiquidityDashboardBranchRow[] = branches.map((branch) => ({
    branchId: branch.branchId,
    branchName: branch.branchName,
    accountCount: branch.accountCount,
    totalLiquidity: branch.totalLiquidity,
    reservedLiquidity: branch.reservedLiquidity,
    availableLiquidity: branch.availableLiquidity,
    consumptionToday: branch.consumptionToday,
    fundingToday: branch.fundingToday,
    health: branch.health,
  }));

  const accountRows: LiquidityDashboardAccountRow[] = accounts.map((account) => ({
    accountId: account.accountId,
    branchId: account.branchId,
    branchName: account.branchName,
    bank: account.bank,
    accountNumber: account.accountNumber,
    currency: account.currency,
    currentBalance: account.currentBalance,
    reservedBalance: account.reservedBalance,
    availableBalance: account.availableBalance,
    minimumThreshold: account.minimumThreshold,
    health: account.health,
  }));

  const fundingRows: LiquidityDashboardFundingRow[] = [...fundingEvents]
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    .map((event) => ({
      fundingEventId: event.fundingEventId,
      branchName: event.branchName,
      accountCount: event.accountCount,
      totalAmount: event.totalAmount,
      updatedAt: event.updatedAt,
      updatedByUserId: event.updatedByUserId,
    }));

  const totalLiquidity = sumBy(branchRows, (row) => row.totalLiquidity);
  const availableLiquidity = sumBy(branchRows, (row) => row.availableLiquidity);
  const reservedLiquidity = sumBy(branchRows, (row) => row.reservedLiquidity);

  const criticalBranches = branchRows.filter((row) => row.health === "RED");
  const lowBalanceBranches = branchRows.filter((row) => row.health !== "GREEN");

  const largestBranch = maxBy(branchRows, (row) => row.totalLiquidity);
  const largestAccount = maxBy(accountRows, (row) => row.currentBalance);

  const stats: LiquidityDashboardStat[] = [
    createStat("total-liquidity", "Total Liquidity", formatAmount(totalLiquidity), "Sum of every active payout account"),
    createStat("available-liquidity", "Available Liquidity", formatAmount(availableLiquidity), "Free to allocate to new transactions"),
    createStat("reserved-liquidity", "Reserved Liquidity", formatAmount(reservedLiquidity), "Committed to transactions in progress"),
    createStat("outstanding-liquidity", "Outstanding Liquidity", formatAmount(totalLiquidity), "Enterprise-wide total across every branch"),
    createStat("critical-branches", "Critical Branches", String(criticalBranches.length), "Branches with no available liquidity"),
    createStat("low-balance-branches", "Low Balance Branches", String(lowBalanceBranches.length), "Branches below their minimum threshold"),
    createStat("largest-branch", "Largest Branch", largestBranch?.branchName ?? "None", "Highest total liquidity"),
    createStat("largest-account", "Largest Account", largestAccount ? `${largestAccount.bank} - ${largestAccount.accountNumber}` : "None", "Highest current balance"),
  ];

  return {
    generatedAt: now.toISOString(),
    stats,
    branches: branchRows.sort((first, second) => first.branchName.localeCompare(second.branchName)),
    accounts: accountRows,
    criticalBranches,
    lowBalanceBranches,
    largestBranch,
    largestAccount,
    fundingHistory: fundingRows.slice(0, 20),
  };
}

function createStat(id: string, label: string, value: string, detail: string): LiquidityDashboardStat {
  return { id, label, value, detail };
}

function sumBy<T>(rows: T[], getValue: (row: T) => number): number {
  return rows.reduce((total, row) => total + getValue(row), 0);
}

function maxBy<T>(rows: T[], getValue: (row: T) => number): T | null {
  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((best, row) => (getValue(row) > getValue(best) ? row : best), rows[0]);
}

function formatAmount(value: number): string {
  return value.toLocaleString();
}
