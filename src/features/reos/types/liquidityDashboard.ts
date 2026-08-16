import type { BranchHealth } from "./dashboard";

export interface LiquidityDashboardBranchRow {
  branchId: string;
  branchName: string;
  accountCount: number;
  totalLiquidity: number;
  reservedLiquidity: number;
  availableLiquidity: number;
  consumptionToday: number;
  fundingToday: number;
  health: BranchHealth;
}

export interface LiquidityDashboardAccountRow {
  accountId: string;
  branchId: string;
  branchName: string | null;
  bank: string;
  accountNumber: string;
  currency: string;
  currentBalance: number;
  reservedBalance: number;
  availableBalance: number;
  minimumThreshold: number;
  health: BranchHealth;
}

export interface LiquidityDashboardFundingRow {
  fundingEventId: string;
  branchName: string | null;
  accountCount: number;
  totalAmount: number;
  updatedAt: string;
  updatedByUserId: string;
}

export interface LiquidityDashboardStat {
  id: string;
  label: string;
  value: string;
  detail: string;
}

export interface LiquidityDashboard {
  generatedAt: string;
  stats: LiquidityDashboardStat[];
  branches: LiquidityDashboardBranchRow[];
  accounts: LiquidityDashboardAccountRow[];
  criticalBranches: LiquidityDashboardBranchRow[];
  lowBalanceBranches: LiquidityDashboardBranchRow[];
  largestBranch: LiquidityDashboardBranchRow | null;
  largestAccount: LiquidityDashboardAccountRow | null;
  fundingHistory: LiquidityDashboardFundingRow[];
}
