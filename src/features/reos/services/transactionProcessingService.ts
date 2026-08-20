import type { HoldReason } from "../types/holdReason";
import type { ReturnReason } from "../types/returnReason";

export const defaultHoldReasons: HoldReason[] = [
  {
    id: "hold-reason-incorrect-details",
    code: "INCORRECT_DETAILS",
    name: "Incorrect / Unclear Beneficiary Details",
    description: "Beneficiary or account details appear wrong or unclear; paused before returning the transaction outright.",
    isActive: true,
  },
  {
    id: "hold-reason-liquidity",
    code: "LIQUIDITY",
    name: "Awaiting Liquidity",
    description: "No payout account currently has enough available balance; on hold pending additional funding.",
    isActive: true,
  },
  {
    id: "hold-reason-beneficiary-confirmation",
    code: "BENEFICIARY_CONFIRMATION",
    name: "Pending Beneficiary Confirmation",
    description: "Beneficiary has been contacted to confirm or correct their details; awaiting response.",
    isActive: true,
  },
  {
    id: "hold-reason-compliance-review",
    code: "COMPLIANCE_REVIEW",
    name: "Compliance Review",
    description: "Flagged for manager or compliance review before processing continues.",
    isActive: true,
  },
  {
    id: "hold-reason-other",
    code: "OTHER",
    name: "Other",
    description: "Reason not covered above - see comment.",
    isActive: true,
  },
];

export function getActiveHoldReasons(): HoldReason[] {
  return defaultHoldReasons.filter((reason) => reason.isActive);
}

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
