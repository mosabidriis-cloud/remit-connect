import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../lib/database.types";
import type { Beneficiary } from "../types/beneficiary";
import type {
  DuplicateCheckResult,
  ImportBatchRecord,
  ImportBeneficiaryRecord,
  ImportSource,
} from "../types/importIntelligence";
import type { SharedBatch } from "../types/sharedBatch";

/**
 * Import Intelligence (DEC-016, IMPORT_INTELLIGENCE.md).
 *
 * The only service that reads/writes the durable Supabase ledger (`import_batches`,
 * `import_beneficiaries`). It does not touch, read, or duplicate the live in-memory
 * operational stores (sharedBatchStore, branchProcessingQueueService, liquidityStore) -
 * those remain the source of truth for the live workflow, exactly as before. This
 * service is the source of truth for one thing only: what has ever been imported.
 *
 * `operationalDatasetService.ts` sits above this file (coverage matrices, historical
 * performance, duplicate groups, import history) - it reads exclusively through the
 * functions exported here rather than querying Supabase a second, competing way, so
 * this remains the one place that talks to `import_batches`/`import_beneficiaries`.
 */

type ImportBatchRow = Database["public"]["Tables"]["import_batches"]["Row"];
type ImportBeneficiaryRow = Database["public"]["Tables"]["import_beneficiaries"]["Row"];

/** SHA-256 of the file's bytes - the fingerprint used for duplicate detection. */
export async function computeFileChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Reporting Period is derived, never entered manually (the objective's explicit "users
 * should never organize data manually"). Taken as the most common YYYY-MM among the
 * file's real business dates - the month the bulk of the file's transactions belong to -
 * rather than the min or max, so one stray out-of-range row can't misclassify a whole
 * file. Falls back to the current month only when no beneficiary carries a usable date.
 */
export function deriveReportingPeriod(beneficiaries: Beneficiary[], now: Date = new Date()): string {
  const periodCounts = new Map<string, number>();

  beneficiaries.forEach((beneficiary) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(beneficiary.transactionDate)) {
      const period = beneficiary.transactionDate.slice(0, 7);
      periodCounts.set(period, (periodCounts.get(period) ?? 0) + 1);
    }
  });

  if (periodCounts.size === 0) {
    return now.toISOString().slice(0, 7);
  }

  return [...periodCounts.entries()].sort((first, second) => second[1] - first[1])[0][0];
}

/**
 * Checks the ledger for a prior import of the same file (by checksum) or the same
 * batch reference within the same reporting period. REPLACED batches are excluded - a
 * confirmed replacement is not itself a live duplicate to warn about again.
 */
export async function checkForDuplicateImport(
  fileChecksum: string,
  batchReference: string,
  reportingPeriod: string,
): Promise<DuplicateCheckResult> {
  const [byChecksum, byReference] = await Promise.all([
    supabase.from("import_batches").select("*").eq("file_checksum", fileChecksum).neq("duplicate_status", "REPLACED"),
    supabase
      .from("import_batches")
      .select("*")
      .eq("batch_reference", batchReference)
      .eq("reporting_period", reportingPeriod)
      .neq("duplicate_status", "REPLACED"),
  ]);

  if (byChecksum.error) {
    throw new Error(byChecksum.error.message);
  }

  if (byReference.error) {
    throw new Error(byReference.error.message);
  }

  const matchesById = new Map<string, ImportBatchRow>();
  [...(byChecksum.data ?? []), ...(byReference.data ?? [])].forEach((row) => matchesById.set(row.id, row));

  const matches = [...matchesById.values()].map(mapRowToRecord);

  return { isDuplicate: matches.length > 0, matches };
}

export interface PersistImportInput {
  sharedBatch: SharedBatch;
  beneficiaries: Beneficiary[];
  file: File;
  fileChecksum: string;
  actorUserId: string;
  /**
   * Set when the operator resolved a duplicate warning. REPLACE marks the prior import
   * superseded and persists this one in full. MERGE keeps the prior import as-is and
   * persists only the beneficiaries not already recorded against it (by Direct Remit
   * Reference) - so re-uploading the same file twice under "Merge" inserts nothing a
   * second time.
   */
  resolution?: { type: "REPLACE" | "MERGE"; existingBatchId: string };
  /** The validation summary the operator saw at Confirm Upload, snapshotted into the ledger as this import's Validation Outcome. */
  validationOutcome: { validRecordCount: number; invalidRecordCount: number; manualReviewRecordCount: number };
}

/**
 * Writes one confirmed import to the durable ledger: one `import_batches` row, one
 * `import_beneficiaries` row per (possibly deduplicated) beneficiary. Runs after, and
 * independently of, the existing in-memory `saveSharedBatch`/`saveBeneficiaries` calls -
 * this call failing or succeeding never blocks or changes the live operational workflow
 * (Section 7, IMPORT_INTELLIGENCE.md).
 */
export async function persistImport(input: PersistImportInput): Promise<ImportBatchRecord> {
  let beneficiariesToPersist = input.beneficiaries;
  let duplicateStatus: ImportBatchRecord["duplicateStatus"] = "UNIQUE";

  if (input.resolution?.type === "REPLACE") {
    const { error } = await supabase
      .from("import_batches")
      .update({ duplicate_status: "REPLACED" })
      .eq("id", input.resolution.existingBatchId);

    if (error) {
      throw new Error(error.message);
    }
  } else if (input.resolution?.type === "MERGE") {
    const { data: existingBeneficiaries, error } = await supabase
      .from("import_beneficiaries")
      .select("direct_remit_reference")
      .eq("import_batch_id", input.resolution.existingBatchId);

    if (error) {
      throw new Error(error.message);
    }

    const existingReferences = new Set((existingBeneficiaries ?? []).map((row) => row.direct_remit_reference));
    beneficiariesToPersist = input.beneficiaries.filter((beneficiary) => !existingReferences.has(beneficiary.directRemitReference));
    duplicateStatus = "MERGED";
  }

  const reportingPeriod = deriveReportingPeriod(beneficiariesToPersist);
  const businessDates = beneficiariesToPersist
    .map((beneficiary) => beneficiary.transactionDate)
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  const currencies = new Set(beneficiariesToPersist.map((beneficiary) => beneficiary.currency).filter(Boolean));
  const singleCurrency = currencies.size === 1 ? [...currencies][0] : null;

  const { data: batchRow, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      source: "DIRECT_REMIT",
      file_name: input.file.name,
      file_checksum: input.fileChecksum,
      batch_reference: input.sharedBatch.reference,
      reporting_period: reportingPeriod,
      business_date_min: businessDates[0] ?? null,
      business_date_max: businessDates[businessDates.length - 1] ?? null,
      transaction_count: beneficiariesToPersist.length,
      total_amount: singleCurrency ? sumAmounts(beneficiariesToPersist) : null,
      currency: singleCurrency,
      duplicate_status: duplicateStatus,
      replaces_batch_id: input.resolution?.existingBatchId ?? null,
      uploaded_by_user_id: input.actorUserId,
      valid_record_count: input.validationOutcome.validRecordCount,
      invalid_record_count: input.validationOutcome.invalidRecordCount,
      manual_review_record_count: input.validationOutcome.manualReviewRecordCount,
    })
    .select()
    .single();

  if (batchError || !batchRow) {
    throw new Error(batchError?.message ?? "Unable to persist the import batch.");
  }

  if (beneficiariesToPersist.length > 0) {
    const rows = beneficiariesToPersist.map((beneficiary) => ({
      import_batch_id: batchRow.id,
      direct_remit_reference: beneficiary.directRemitReference,
      business_date: /^\d{4}-\d{2}-\d{2}$/.test(beneficiary.transactionDate) ? beneficiary.transactionDate : null,
      beneficiary_name: beneficiary.beneficiaryName,
      currency: beneficiary.currency,
      amount: beneficiary.amount,
      destination_country: beneficiary.destinationCountry || null,
      bank_name: beneficiary.bankName || null,
      account_number: beneficiary.accountNumber || null,
      processing_status_id: beneficiary.processingStatusId,
    }));

    const { error: beneficiariesError } = await supabase.from("import_beneficiaries").insert(rows);

    if (beneficiariesError) {
      throw new Error(beneficiariesError.message);
    }
  }

  return mapRowToRecord(batchRow);
}

/** Durable Import History - survives reload, unlike everything else REOS currently tracks. */
export async function getImportHistory(): Promise<ImportBatchRecord[]> {
  const { data, error } = await supabase
    .from("import_batches")
    .select("*")
    .order("upload_timestamp", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRowToRecord);
}

/** Every beneficiary durably recorded against one import batch - the "link to imported dataset" drill-down. */
export async function getImportBatchBeneficiaries(importBatchId: string): Promise<ImportBeneficiaryRecord[]> {
  const { data, error } = await supabase
    .from("import_beneficiaries")
    .select("*")
    .eq("import_batch_id", importBatchId)
    .order("business_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapBeneficiaryRowToRecord);
}

function sumAmounts(beneficiaries: Beneficiary[]): number {
  return beneficiaries.reduce((total, beneficiary) => total + beneficiary.amount, 0);
}

function mapRowToRecord(row: ImportBatchRow): ImportBatchRecord {
  return {
    id: row.id,
    source: row.source as ImportSource,
    fileName: row.file_name,
    fileChecksum: row.file_checksum,
    batchReference: row.batch_reference,
    reportingPeriod: row.reporting_period,
    businessDateMin: row.business_date_min,
    businessDateMax: row.business_date_max,
    transactionCount: row.transaction_count,
    totalAmount: row.total_amount,
    currency: row.currency,
    duplicateStatus: row.duplicate_status as ImportBatchRecord["duplicateStatus"],
    replacesBatchId: row.replaces_batch_id,
    uploadedByUserId: row.uploaded_by_user_id,
    uploadTimestamp: row.upload_timestamp,
    validRecordCount: row.valid_record_count,
    invalidRecordCount: row.invalid_record_count,
    manualReviewRecordCount: row.manual_review_record_count,
  };
}

function mapBeneficiaryRowToRecord(row: ImportBeneficiaryRow): ImportBeneficiaryRecord {
  return {
    id: row.id,
    importBatchId: row.import_batch_id,
    directRemitReference: row.direct_remit_reference,
    businessDate: row.business_date,
    beneficiaryName: row.beneficiary_name,
    currency: row.currency,
    amount: row.amount,
    destinationCountry: row.destination_country,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    processingStatusId: row.processing_status_id,
  };
}
