import type { Beneficiary } from "./beneficiary";
import type { SharedBatch } from "./sharedBatch";

export type SharedBatchValidationSeverity =
  | "ERROR"
  | "WARNING";

export interface DirectRemitBatchRow {
  directRemitReference: string;
  transactionDate: string;
  beneficiaryName: string;
  currency: string;
  amount: number;
  destinationCountry: string;
  bank: string;
}

export interface BankParseResult {
  bankName: string;
  accountNumber: string;
}

export interface SharedBatchValidationIssue {
  rowNumber: number;
  field: string;
  message: string;
  severity: SharedBatchValidationSeverity;
}

export interface SharedBatchImportResult {
  sharedBatch: SharedBatch;
  beneficiaries: Beneficiary[];
  validationIssues: SharedBatchValidationIssue[];
  canCreateSharedBatch: boolean;
}
