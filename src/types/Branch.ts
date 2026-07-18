export type BranchStatus =
  | "Ready"
  | "Funding Soon"
  | "Urgent Funding";

export interface Branch {
  id: number;
  code: string;
  name: string;
  manager: string;
  city: string;
  state: string;
  phone: string;
  email?: string;
  liquidity: number;
  availableAccounts: number;
  filesReady: number;
  status: BranchStatus;
  usdBalance: number;
  sdgBalance: number;
  liquidityLimit: number;
  services: string[];
  lastUpdated: string;
  active: boolean;
}