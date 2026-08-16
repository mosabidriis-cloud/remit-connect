import { recordAuditEvent } from "./auditService";
import {
  getAllFundingEvents,
  getAllPayoutAccounts,
  getFundingEventsByBranch,
  getPayoutAccount,
  getPayoutAccountsByBranch,
  insertPayoutAccount,
  updatePayoutAccountRecord,
  saveFundingEvent,
} from "./liquidityStore";
import type { FundingEntry, FundingEvent, PayoutAccount } from "../types/liquidity";

/**
 * Liquidity Management business logic (LIQUIDITY_MANAGEMENT.md Sections 6-7).
 *
 * Owns the only writes to PayoutAccount.currentBalance: recordFunding (increase) and
 * deductForTransaction (decrease). deductForTransaction is called exactly once, from
 * branchProcessingQueueService.completeBranchProcessingQueueItem - see Section 7.1 for
 * why deduction happens at completion, not at account selection.
 *
 * Operational Persistence Milestone 3 (DEC-021, OPERATIONAL_PERSISTENCE.md): every
 * export keeps its exact original name and shape; only `liquidityStore.ts` moved from a
 * `Map` to Supabase, so every function here is now `async`.
 */

const maxAccountsPerBranch = 100;

export interface AddPayoutAccountInput {
  branchId: string;
  bank: string;
  accountNumber: string;
  currency: string;
  openingBalance: number;
  minimumThreshold: number;
  actorUserId: string;
}

export async function addPayoutAccount(input: AddPayoutAccountInput): Promise<PayoutAccount> {
  if (!input.bank.trim() || !input.accountNumber.trim() || !input.currency.trim()) {
    throw new Error("Bank, account number and currency are required.");
  }

  if (input.openingBalance < 0 || input.minimumThreshold < 0) {
    throw new Error("Balance and minimum threshold cannot be negative.");
  }

  const existingCount = (await getPayoutAccountsByBranch(input.branchId)).length;

  if (existingCount >= maxAccountsPerBranch) {
    throw new Error(`A branch may not own more than ${maxAccountsPerBranch} payout accounts.`);
  }

  const account: PayoutAccount = {
    id: `payout-account-${crypto.randomUUID()}`,
    branchId: input.branchId,
    bank: input.bank.trim(),
    accountNumber: input.accountNumber.trim(),
    currency: input.currency.trim(),
    currentBalance: input.openingBalance,
    minimumThreshold: input.minimumThreshold,
    status: "ACTIVE",
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedByUserId: input.actorUserId,
  };

  const savedAccount = await insertPayoutAccount(account);

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "PAYOUT_ACCOUNT_CREATED",
    entityType: "PAYOUT_ACCOUNT",
    entityId: account.id,
    branchId: input.branchId,
    details: `Created payout account ${input.bank} - ${input.accountNumber} (${input.currency} ${input.openingBalance.toLocaleString()}).`,
  });

  return savedAccount;
}

export interface UpdatePayoutAccountInput {
  accountId: string;
  bank: string;
  accountNumber: string;
  currency: string;
  minimumThreshold: number;
  actorUserId: string;
}

/**
 * Edits identity fields only. currentBalance is never accepted here - it changes only
 * through recordFunding or deductForTransaction, so a balance can never be silently
 * overwritten by an unrelated edit.
 */
export async function updatePayoutAccount(input: UpdatePayoutAccountInput): Promise<PayoutAccount> {
  const account = await getPayoutAccount(input.accountId);

  if (!account) {
    throw new Error("Payout account was not found.");
  }

  if (!input.bank.trim() || !input.accountNumber.trim() || !input.currency.trim()) {
    throw new Error("Bank, account number and currency are required.");
  }

  if (input.minimumThreshold < 0) {
    throw new Error("Minimum threshold cannot be negative.");
  }

  const savedAccount = await updatePayoutAccountRecord({
    ...account,
    bank: input.bank.trim(),
    accountNumber: input.accountNumber.trim(),
    currency: input.currency.trim(),
    minimumThreshold: input.minimumThreshold,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedByUserId: input.actorUserId,
  });

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "PAYOUT_ACCOUNT_UPDATED",
    entityType: "PAYOUT_ACCOUNT",
    entityId: account.id,
    branchId: account.branchId,
    details: `Updated payout account ${input.bank} - ${input.accountNumber}.`,
  });

  return savedAccount;
}

export async function setPayoutAccountStatus(
  accountId: string,
  status: PayoutAccount["status"],
  actorUserId: string,
): Promise<PayoutAccount> {
  const account = await getPayoutAccount(accountId);

  if (!account) {
    throw new Error("Payout account was not found.");
  }

  const savedAccount = await updatePayoutAccountRecord({
    ...account,
    status,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedByUserId: actorUserId,
  });

  await recordAuditEvent({
    actorUserId,
    action: "PAYOUT_ACCOUNT_STATUS_CHANGED",
    entityType: "PAYOUT_ACCOUNT",
    entityId: accountId,
    branchId: account.branchId,
    details: `Changed payout account ${account.bank} - ${account.accountNumber} status to ${status}.`,
  });

  return savedAccount;
}

export interface RecordFundingInput {
  branchId: string;
  entries: Array<{ accountId: string; amount: number }>;
  actorUserId: string;
  reference?: string;
  notes?: string;
}

/**
 * Manual funding, no approval (LIQUIDITY_MANAGEMENT.md Section 7.3). One funding event
 * may update one or many accounts; every account touched gets its own FundingEntry
 * recording previous/new balance, and all entries are recorded under one FundingEvent so
 * the history reads as one operator action, not N unrelated ones.
 *
 * Processed sequentially (not Promise.all) so that if the same account ever appeared
 * twice in one request, the second entry would read the first entry's write - the same
 * behavior the in-memory Map version had by construction.
 */
export async function recordFunding(input: RecordFundingInput): Promise<FundingEvent> {
  if (input.entries.length === 0) {
    throw new Error("Select at least one account to fund.");
  }

  const entries: FundingEntry[] = [];

  for (const { accountId, amount } of input.entries) {
    if (amount <= 0) {
      throw new Error("Funding amount must be greater than zero.");
    }

    const account = await getPayoutAccount(accountId);

    if (!account) {
      throw new Error("Payout account was not found.");
    }

    if (account.branchId !== input.branchId) {
      throw new Error("Payout account does not belong to the selected branch.");
    }

    if (account.status !== "ACTIVE") {
      throw new Error("Funding can only be recorded against an active account.");
    }

    const previousBalance = account.currentBalance;
    const newBalance = previousBalance + amount;

    await updatePayoutAccountRecord({
      ...account,
      currentBalance: newBalance,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedByUserId: input.actorUserId,
    });

    entries.push({ accountId, previousBalance, fundingAmount: amount, newBalance });
  }

  const event: FundingEvent = {
    id: `funding-event-${crypto.randomUUID()}`,
    branchId: input.branchId,
    entries,
    totalAmount: entries.reduce((total, entry) => total + entry.fundingAmount, 0),
    updatedByUserId: input.actorUserId,
    updatedAt: new Date().toISOString(),
    reference: input.reference?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  const savedEvent = await saveFundingEvent(event);

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "FUNDING_RECORDED",
    entityType: "FUNDING_EVENT",
    entityId: event.id,
    branchId: input.branchId,
    details: `Recorded funding of ${event.totalAmount.toLocaleString()} across ${entries.length} account(s).`,
    performedAt: event.updatedAt,
  });

  return savedEvent;
}

/**
 * The one real balance deduction in this module (Section 7.1). Called exactly once, from
 * branchProcessingQueueService.completeBranchProcessingQueueItem, at the moment a
 * transaction becomes COMPLETED - the only status transition with no path back out, so no
 * reversal logic is needed anywhere.
 */
export async function deductForTransaction(accountId: string, amount: number, actorUserId: string): Promise<PayoutAccount> {
  const account = await getPayoutAccount(accountId);

  if (!account) {
    throw new Error("Payout account was not found.");
  }

  if (account.status !== "ACTIVE") {
    throw new Error("Cannot pay out from an inactive account.");
  }

  if (account.currentBalance < amount) {
    throw new Error("Insufficient balance on the selected payout account.");
  }

  return updatePayoutAccountRecord({
    ...account,
    currentBalance: account.currentBalance - amount,
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedByUserId: actorUserId,
  });
}

export async function getAccountBalance(accountId: string): Promise<number | null> {
  const account = await getPayoutAccount(accountId);
  return account?.currentBalance ?? null;
}

export { getAllPayoutAccounts, getPayoutAccountsByBranch, getAllFundingEvents, getFundingEventsByBranch };
