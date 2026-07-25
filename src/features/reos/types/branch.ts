export type BranchStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  status: BranchStatus;
}
