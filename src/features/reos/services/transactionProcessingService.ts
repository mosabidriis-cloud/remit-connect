import type { ReturnReason } from "../types/returnReason";

export const defaultReturnReasons: ReturnReason[] = [
  {
    id: "return-reason-incomplete",
    code: "INCOMPLETE",
    name: "Incomplete Documentation",
    description: "Proof-of-payment or supporting documents are incomplete.",
    isActive: true,
  },
  {
    id: "return-reason-incorrect",
    code: "INCORRECT",
    name: "Incorrect Beneficiary Details",
    description: "The beneficiary or account details do not match the uploaded record.",
    isActive: true,
  },
  {
    id: "return-reason-duplicate",
    code: "DUPLICATE",
    name: "Duplicate Transaction",
    description: "The transaction appears to be duplicated.",
    isActive: true,
  },
];

export function getActiveReturnReasons(): ReturnReason[] {
  return defaultReturnReasons.filter((reason) => reason.isActive);
}
