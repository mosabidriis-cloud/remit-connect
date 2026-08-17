import { getImportBatchBeneficiaries, getImportHistory } from "./importIntelligenceService";
import type { ImportBatchRecord, ImportSource } from "../types/importIntelligence";
import type {
  CoverageCell,
  CoverageMonthRow,
  CoverageYearGroup,
  DuplicateGroup,
  DuplicateReason,
  HistoricalPerformanceResult,
  ImportDetail,
  ImportHistoryEntry,
  PeriodPerformance,
  SourceTotals,
} from "../types/operationalDataset";

/**
 * Operational Dataset (docs/AI/IMPORT_INTELLIGENCE.md Section 13).
 *
 * The single read layer for Data Coverage, Import History, Duplicate Management and
 * Historical Performance. Every function here reads exclusively through
 * `importIntelligenceService.getImportHistory()`/`getImportBatchBeneficiaries()` - one
 * Supabase query path, transformed in memory - rather than querying `import_batches`/
 * `import_beneficiaries` a second, competing way.
 *
 * Deliberately NOT consumed by Branch Processing or Liquidity Management - those keep
 * their own live in-memory state as their operational source of truth (confirmed scope
 * decision, 2026-08-08; see CURRENT_SPRINT.md and IMPORT_INTELLIGENCE.md Section 13).
 */

const ALL_SOURCES: ImportSource[] = ["DIRECT_REMIT"];

/**
 * Data Coverage as Year -> Month -> Source. A cell's status is derived strictly from
 * what the ledger records - nothing here is inferred beyond the data:
 *  - MISSING: no batch was ever recorded for this period+source.
 *  - DUPLICATE: more than one batch was ever recorded for this period+source (even if
 *    now resolved to one active batch via Replace) - flagged for Duplicate Management,
 *    not hidden.
 *  - INCOMPLETE: exactly one batch, but its business date range doesn't span the full
 *    calendar month (min day != 1, or max day != the month's last day).
 *  - IMPORTED: exactly one batch, spanning the full month.
 */
export async function getCoverageMatrix(): Promise<CoverageYearGroup[]> {
  const batches = await getImportHistory();
  const periods = buildPeriodRange(batches.map((batch) => batch.reportingPeriod));

  const monthRows: CoverageMonthRow[] = periods.map((period) => {
    const [year, month] = period.split("-").map(Number);

    const cells: CoverageCell[] = ALL_SOURCES.map((source) => {
      const batchesForCell = batches.filter((batch) => batch.source === source && batch.reportingPeriod === period);

      if (batchesForCell.length === 0) {
        return { source, status: "MISSING", batchCount: 0, activeTransactionCount: 0 };
      }

      const activeBatches = batchesForCell.filter((batch) => batch.duplicateStatus !== "REPLACED");
      const activeTransactionCount = activeBatches.reduce((total, batch) => total + batch.transactionCount, 0);

      if (batchesForCell.length > 1) {
        return { source, status: "DUPLICATE", batchCount: batchesForCell.length, activeTransactionCount };
      }

      const complete = isDateRangeCompleteForMonth(year, month, batchesForCell[0].businessDateMin, batchesForCell[0].businessDateMax);

      return { source, status: complete ? "IMPORTED" : "INCOMPLETE", batchCount: 1, activeTransactionCount };
    });

    return { year, month, period, cells };
  });

  const years = [...new Set(monthRows.map((row) => row.year))].sort((first, second) => first - second);

  return years.map((year) => ({ year, months: monthRows.filter((row) => row.year === year) }));
}

/**
 * Import History, each entry additionally carrying whether it was the first-ever batch
 * recorded for its (source, reportingPeriod) - i.e. whether it filled a coverage gap
 * ("FIRST_FOR_PERIOD") or added onto/duplicated existing coverage ("ADDITIONAL").
 */
export async function getImportHistoryEntries(): Promise<ImportHistoryEntry[]> {
  const batches = await getImportHistory();

  const earliestIdByKey = new Map<string, string>();
  [...batches]
    .sort((first, second) => first.uploadTimestamp.localeCompare(second.uploadTimestamp))
    .forEach((batch) => {
      const key = `${batch.source}::${batch.reportingPeriod}`;
      if (!earliestIdByKey.has(key)) {
        earliestIdByKey.set(key, batch.id);
      }
    });

  return batches.map((batch) => ({
    ...batch,
    coverageImpact: earliestIdByKey.get(`${batch.source}::${batch.reportingPeriod}`) === batch.id ? "FIRST_FOR_PERIOD" : "ADDITIONAL",
  }));
}

/** One batch plus its durably-recorded beneficiaries - Import History's "link to imported dataset". */
export async function getImportDetail(batchId: string): Promise<ImportDetail | null> {
  const [batches, beneficiaries] = await Promise.all([getImportHistory(), getImportBatchBeneficiaries(batchId)]);
  const batch = batches.find((entry) => entry.id === batchId);

  return batch ? { batch, beneficiaries } : null;
}

/**
 * Duplicate Management: connected groups of batches related by the same signals
 * `checkForDuplicateImport` already uses at upload time (same file checksum; same
 * batch reference + reporting period), plus the explicit Replace/Merge chain
 * (`replacesBatchId`). A group of size 1 isn't a duplicate, so those are dropped.
 */
export async function getDuplicateGroups(): Promise<DuplicateGroup[]> {
  const batches = await getImportHistory();
  const parent = new Map<string, string>(batches.map((batch) => [batch.id, batch.id]));

  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root) as string;
    }
    return root;
  };

  const union = (first: string, second: string) => {
    const rootFirst = find(first);
    const rootSecond = find(second);
    if (rootFirst !== rootSecond) {
      parent.set(rootFirst, rootSecond);
    }
  };

  const reasonPairs: Array<{ first: string; second: string; reason: DuplicateReason }> = [];

  Object.values(groupBy(batches, (batch) => batch.fileChecksum))
    .filter((group) => group.length > 1)
    .forEach((group) => {
      for (let index = 1; index < group.length; index += 1) {
        union(group[0].id, group[index].id);
        reasonPairs.push({ first: group[0].id, second: group[index].id, reason: "SAME_FILE_CHECKSUM" });
      }
    });

  Object.values(groupBy(batches, (batch) => `${batch.batchReference}::${batch.reportingPeriod}`))
    .filter((group) => group.length > 1)
    .forEach((group) => {
      for (let index = 1; index < group.length; index += 1) {
        union(group[0].id, group[index].id);
        reasonPairs.push({ first: group[0].id, second: group[index].id, reason: "SAME_BATCH_REFERENCE_AND_PERIOD" });
      }
    });

  batches
    .filter((batch) => batch.replacesBatchId)
    .forEach((batch) => {
      union(batch.id, batch.replacesBatchId as string);
      reasonPairs.push({ first: batch.id, second: batch.replacesBatchId as string, reason: "REPLACEMENT_CHAIN" });
    });

  const membersByRoot = new Map<string, ImportBatchRecord[]>();
  batches.forEach((batch) => {
    const root = find(batch.id);
    const members = membersByRoot.get(root) ?? [];
    members.push(batch);
    membersByRoot.set(root, members);
  });

  const groups: DuplicateGroup[] = [];
  membersByRoot.forEach((members, root) => {
    if (members.length < 2) {
      return;
    }

    const memberIds = new Set(members.map((member) => member.id));
    const reasons = [...new Set(
      reasonPairs
        .filter((pair) => memberIds.has(pair.first) && memberIds.has(pair.second))
        .map((pair) => pair.reason),
    )];
    const sortedMembers = [...members].sort((first, second) => second.uploadTimestamp.localeCompare(first.uploadTimestamp));

    groups.push({
      id: root,
      source: sortedMembers[0].source,
      reportingPeriod: sortedMembers[0].reportingPeriod,
      reasons,
      batches: sortedMembers,
    });
  });

  return groups.sort((first, second) => second.batches[0].uploadTimestamp.localeCompare(first.batches[0].uploadTimestamp));
}

/**
 * Historical Performance: Month-over-Month and Year-over-Year transaction growth, and
 * Source comparison, computed purely from the ledger. Branch comparison is
 * deliberately not offered here - `import_batches` carries no branch dimension, because
 * branch assignment is a live-workflow event that happens after import and is never
 * persisted to this ledger (see IMPORT_INTELLIGENCE.md Section 13). Branch-scoped data
 * remains available in Reports, reading the live operational stores as it always has.
 */
export async function getHistoricalPerformance(): Promise<HistoricalPerformanceResult> {
  const batches = await getImportHistory();
  const activeBatches = batches.filter((batch) => batch.duplicateStatus !== "REPLACED");
  const periodKeys = buildPeriodRange(activeBatches.map((batch) => batch.reportingPeriod));

  const periodsRaw = periodKeys.map((period) => {
    const [year, month] = period.split("-").map(Number);
    const batchesForPeriod = activeBatches.filter((batch) => batch.reportingPeriod === period);
    const transactionCount = batchesForPeriod.reduce((total, batch) => total + batch.transactionCount, 0);

    const amountsByCurrencyMap = new Map<string, number>();
    batchesForPeriod.forEach((batch) => {
      if (batch.currency && batch.totalAmount !== null) {
        amountsByCurrencyMap.set(batch.currency, (amountsByCurrencyMap.get(batch.currency) ?? 0) + batch.totalAmount);
      }
    });

    return {
      period,
      year,
      month,
      batchCount: batchesForPeriod.length,
      transactionCount,
      amountsByCurrency: [...amountsByCurrencyMap.entries()].map(([currency, totalAmount]) => ({ currency, totalAmount })),
    };
  });

  const countByPeriod = new Map(periodsRaw.map((entry) => [entry.period, entry.transactionCount]));

  const periods: PeriodPerformance[] = periodsRaw.map((entry, index) => {
    const previous = index > 0 ? periodsRaw[index - 1] : null;
    const momGrowthPercent =
      previous && previous.transactionCount > 0 && entry.transactionCount > 0
        ? ((entry.transactionCount - previous.transactionCount) / previous.transactionCount) * 100
        : null;

    const priorYearPeriod = `${entry.year - 1}-${String(entry.month).padStart(2, "0")}`;
    const priorYearCount = countByPeriod.get(priorYearPeriod) ?? 0;
    const yoyGrowthPercent =
      priorYearCount > 0 && entry.transactionCount > 0 ? ((entry.transactionCount - priorYearCount) / priorYearCount) * 100 : null;

    return { ...entry, momGrowthPercent, yoyGrowthPercent };
  });

  const sourceComparison: SourceTotals[] = ALL_SOURCES.map((source) => {
    const batchesForSource = activeBatches.filter((batch) => batch.source === source);

    return {
      source,
      batchCount: batchesForSource.length,
      transactionCount: batchesForSource.reduce((total, batch) => total + batch.transactionCount, 0),
    };
  });

  return { periods, sourceComparison };
}

function buildPeriodRange(observedPeriods: string[]): string[] {
  if (observedPeriods.length === 0) {
    return [new Date().toISOString().slice(0, 7)];
  }

  const sorted = [...observedPeriods].sort();
  const [startYear, startMonth] = sorted[0].split("-").map(Number);
  const [endYear, endMonth] = sorted[sorted.length - 1].split("-").map(Number);

  const periods: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return periods;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isDateRangeCompleteForMonth(year: number, month: number, min: string | null, max: string | null): boolean {
  if (!min || !max) {
    return false;
  }

  const minDay = Number(min.slice(8, 10));
  const maxDay = Number(max.slice(8, 10));

  return minDay === 1 && maxDay === daysInMonth(year, month);
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  items.forEach((item) => {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  });

  return result;
}
