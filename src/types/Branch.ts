export type BranchStatus =
  | "Ready"
  | "Funding Soon"
  | "Urgent Funding";

export interface Branch {
  id: number;
  name: string;
  liquidity: number;
  availableAccounts: number;
  filesReady: number;
  status: BranchStatus;
  lastUpdated: string;
  active: boolean;
}