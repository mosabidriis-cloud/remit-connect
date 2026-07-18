export type BranchStatus =
  | "Ready"
  | "Funding Soon"
  | "Urgent Funding";

export type LiquidityHealth = "Healthy" | "Warning" | "Critical";
export type LiquidityAlertLevel = "None" | "Warning" | "Critical";

export interface BranchLiquidity {
  usdBalance: number;
  sdgBalance: number;
  liquidityLimit: number;
  minimumThreshold: number;
  availableLiquidity: number;
  health: LiquidityHealth;
  isBelowThreshold: boolean;
  alertLevel: LiquidityAlertLevel;
}

export interface Branch {
  id: number;
  code: string;
  name: string;
  manager: string;
  city: string;
  state: string;
  phone: string;
  email?: string;
  liquidity: BranchLiquidity;
  availableAccounts: number;
  filesReady: number;
  status: BranchStatus;
  services: string[];
  lastUpdated: string;
  active: boolean;
}