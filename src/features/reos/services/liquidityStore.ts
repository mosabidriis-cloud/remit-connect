import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../lib/database.types";
import type { FundingEntry, FundingEvent, PayoutAccount, PayoutAccountStatus } from "../types/liquidity";

/**
 * Operational Persistence Milestone 3 (DEC-021, OPERATIONAL_PERSISTENCE.md). Supabase-
 * backed - the durable counterpart to Liquidity Management's `PayoutAccount`/`FundingEvent`
 * data, the last Phase 2 store. Every export keeps its exact original name and shape;
 * only the implementation moved from a `Map` to `payout_accounts`/`funding_events`/
 * `funding_entries`, and every function is now `async`.
 *
 * `FundingEntry` has no id of its own in `types/liquidity.ts` - it is a value list
 * embedded on `FundingEvent`, not independent data. It is written once, alongside its
 * parent `funding_events` row, and reconstructed at read time by querying
 * `funding_entries` for the event's id - the same "view over child rows, not a second
 * copy" shape Milestone 1 established for Assignment's transaction lists.
 */

type PayoutAccountRow = Database["public"]["Tables"]["payout_accounts"]["Row"];
type FundingEventRow = Database["public"]["Tables"]["funding_events"]["Row"];
type FundingEntryRow = Database["public"]["Tables"]["funding_entries"]["Row"];

/**
 * DEC-024: split from a single `upsert`-based `savePayoutAccount` into distinct
 * insert/update paths so `payout_accounts_insert` RLS can be Operations-Manager-only
 * without blocking a Branch Officer's legitimate balance updates (`deductForTransaction`,
 * `recordFunding`) - an `upsert` requires the INSERT policy to pass even when the
 * statement resolves as an update, which is exactly the gap DEC-021 provisionally
 * accepted and DEC-024 closes.
 */
export async function insertPayoutAccount(account: PayoutAccount): Promise<PayoutAccount> {
  const { error } = await supabase.from("payout_accounts").insert(payoutAccountToRow(account));

  if (error) {
    throw new Error(error.message);
  }

  return account;
}

export async function updatePayoutAccountRecord(account: PayoutAccount): Promise<PayoutAccount> {
  const { error } = await supabase
    .from("payout_accounts")
    .update(payoutAccountToRow(account))
    .eq("id", account.id);

  if (error) {
    throw new Error(error.message);
  }

  return account;
}

export async function getPayoutAccount(accountId: string): Promise<PayoutAccount | null> {
  const { data, error } = await supabase.from("payout_accounts").select("*").eq("id", accountId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRowToPayoutAccount(data) : null;
}

export async function getPayoutAccountsByBranch(branchId: string): Promise<PayoutAccount[]> {
  const { data, error } = await supabase.from("payout_accounts").select("*").eq("branch_id", branchId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToPayoutAccount);
}

/**
 * Enterprise-wide enumeration, same DEC-007 guarantee as sharedBatchStore's
 * getAllSharedBatches - a durable query, not an internal collection exposed.
 */
export async function getAllPayoutAccounts(): Promise<readonly PayoutAccount[]> {
  const { data, error } = await supabase.from("payout_accounts").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToPayoutAccount);
}

export async function saveFundingEvent(event: FundingEvent): Promise<FundingEvent> {
  const { error: eventError } = await supabase.from("funding_events").insert(fundingEventToRow(event));

  if (eventError) {
    throw new Error(eventError.message);
  }

  if (event.entries.length > 0) {
    const { error: entriesError } = await supabase
      .from("funding_entries")
      .insert(event.entries.map((entry) => fundingEntryToRow(event.id, entry)));

    if (entriesError) {
      throw new Error(entriesError.message);
    }
  }

  return event;
}

export async function getFundingEventsByBranch(branchId: string): Promise<FundingEvent[]> {
  const { data, error } = await supabase
    .from("funding_events")
    .select("*")
    .eq("branch_id", branchId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return hydrateFundingEvents(data ?? []);
}

export async function getAllFundingEvents(): Promise<readonly FundingEvent[]> {
  const { data, error } = await supabase.from("funding_events").select("*");

  if (error) {
    throw new Error(error.message);
  }

  return hydrateFundingEvents(data ?? []);
}

/** Batches one funding_entries query across every event, rather than one per event. */
async function hydrateFundingEvents(rows: FundingEventRow[]): Promise<FundingEvent[]> {
  if (rows.length === 0) {
    return [];
  }

  const eventIds = rows.map((row) => row.id);
  const { data, error } = await supabase.from("funding_entries").select("*").in("funding_event_id", eventIds);

  if (error) {
    throw new Error(error.message);
  }

  const entriesByEventId = new Map<string, FundingEntry[]>();
  (data ?? []).forEach((row) => {
    const existing = entriesByEventId.get(row.funding_event_id) ?? [];
    existing.push(mapRowToFundingEntry(row));
    entriesByEventId.set(row.funding_event_id, existing);
  });

  return rows.map((row) => mapRowToFundingEvent(row, entriesByEventId.get(row.id) ?? []));
}

function payoutAccountToRow(account: PayoutAccount): Database["public"]["Tables"]["payout_accounts"]["Insert"] {
  return {
    id: account.id,
    branch_id: account.branchId,
    bank: account.bank,
    account_number: account.accountNumber,
    currency: account.currency,
    current_balance: account.currentBalance,
    minimum_threshold: account.minimumThreshold,
    status: account.status,
    last_updated_at: account.lastUpdatedAt,
    last_updated_by_user_id: account.lastUpdatedByUserId,
  };
}

function mapRowToPayoutAccount(row: PayoutAccountRow): PayoutAccount {
  return {
    id: row.id,
    branchId: row.branch_id,
    bank: row.bank,
    accountNumber: row.account_number,
    currency: row.currency,
    currentBalance: row.current_balance,
    minimumThreshold: row.minimum_threshold,
    status: row.status as PayoutAccountStatus,
    lastUpdatedAt: row.last_updated_at,
    lastUpdatedByUserId: row.last_updated_by_user_id,
  };
}

function fundingEventToRow(event: FundingEvent): Database["public"]["Tables"]["funding_events"]["Insert"] {
  return {
    id: event.id,
    branch_id: event.branchId,
    total_amount: event.totalAmount,
    updated_by_user_id: event.updatedByUserId,
    updated_at: event.updatedAt,
    reference: event.reference,
    notes: event.notes,
  };
}

function mapRowToFundingEvent(row: FundingEventRow, entries: FundingEntry[]): FundingEvent {
  return {
    id: row.id,
    branchId: row.branch_id,
    entries,
    totalAmount: row.total_amount,
    updatedByUserId: row.updated_by_user_id,
    updatedAt: row.updated_at,
    reference: row.reference,
    notes: row.notes,
  };
}

function fundingEntryToRow(
  fundingEventId: string,
  entry: FundingEntry,
): Database["public"]["Tables"]["funding_entries"]["Insert"] {
  return {
    funding_event_id: fundingEventId,
    account_id: entry.accountId,
    previous_balance: entry.previousBalance,
    funding_amount: entry.fundingAmount,
    new_balance: entry.newBalance,
  };
}

function mapRowToFundingEntry(row: FundingEntryRow): FundingEntry {
  return {
    accountId: row.account_id,
    previousBalance: row.previous_balance,
    fundingAmount: row.funding_amount,
    newBalance: row.new_balance,
  };
}
