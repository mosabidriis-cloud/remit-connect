/**
 * Import Intelligence domain types (DEC-016, IMPORT_INTELLIGENCE.md).
 *
 * These describe the durable Supabase ledger - evidence of what was imported, when,
 * and its fingerprint/coverage. They are deliberately separate from Beneficiary/
 * SharedBatch (types/beneficiary.ts, types/sharedBatch.ts), which remain the live,
 * in-memory operational workflow model (DEC-004). An ImportBatchRecord is not a
 * SharedBatch under a new name - it is the durable record that a SharedBatch was
 * once imported.
 */

export type ImportSource = "DIRECT_REMIT" | "WESTERN_UNION" | "RIA" | "MONEYGRAM" | "TERRAPAY";

export type ImportDuplicateStatus = "UNIQUE" | "REPLACED" | "MERGED";

export interface ImportBatchRecord {
  id: string;
  source: ImportSource;
  fileName: string;
  fileChecksum: string;
  batchReference: string;
  reportingPeriod: string;
  businessDateMin: string | null;
  businessDateMax: string | null;
  transactionCount: number;
  totalAmount: number | null;
  currency: string | null;
  duplicateStatus: ImportDuplicateStatus;
  replacesBatchId: string | null;
  uploadedByUserId: string;
  uploadTimestamp: string;
  /**
   * Snapshot of the validation summary the operator saw at the moment they confirmed
   * this upload (Operational Dataset "Validation Outcome"). Null for any batch imported
   * before this snapshot was captured.
   */
  validRecordCount: number | null;
  invalidRecordCount: number | null;
  manualReviewRecordCount: number | null;
}

/** A single beneficiary row as durably recorded against an import batch. */
export interface ImportBeneficiaryRecord {
  id: string;
  importBatchId: string;
  directRemitReference: string;
  businessDate: string | null;
  beneficiaryName: string;
  currency: string;
  amount: number;
  destinationCountry: string | null;
  bankName: string | null;
  accountNumber: string | null;
  processingStatusId: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: ImportBatchRecord[];
}

export type DuplicateResolution = "REPLACE" | "MERGE" | "CANCEL";
