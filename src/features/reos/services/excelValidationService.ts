import { read, utils, type WorkSheet } from "xlsx";
import type { Beneficiary } from "../types/beneficiary";
import type { SharedBatch } from "../types/sharedBatch";

export type ExcelValidationIssue = {
  id: string;
  field: string;
  message: string;
  severity: "ERROR" | "WARNING";
};

export type ExcelValidationSummary = {
  batchReference: string;
  uploadDate: string;
  uploadedBy: string;
  totalRecords: number;
  validRecords: number;
  manualReview: number;
  duplicates: number;
  invalidRecords: number;
  status: string;
  readyForAssignment: boolean;
  processingMode: string;
  batchStatus: string;
};

export type ExcelValidationResult = {
  summary: ExcelValidationSummary;
  issues: ExcelValidationIssue[];
  sharedBatch: SharedBatch;
  beneficiaries: Beneficiary[];
};

const requiredColumns = [
  "Direct Remit Reference",
  "Beneficiary Name",
  "Amount",
  "Currency",
  "Bank Name",
  "Account Number",
] as const;

export async function validateExcelUpload(file: File): Promise<ExcelValidationResult> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Only .xlsx files are supported.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]] as WorkSheet | undefined;

  if (!sheet) {
    throw new Error("The workbook does not contain a worksheet to validate.");
  }

  const rows = utils.sheet_to_json<(string | number | Date | undefined)[]>(sheet, {
    defval: "",
    header: 1,
    raw: false,
  });

  const headers = normalizeRow(rows[0] ?? []);
  const issues: ExcelValidationIssue[] = [];
  const missingColumns = requiredColumns.filter((column) => !headers.some((header) => normalizeHeader(header) === normalizeHeader(column)));

  missingColumns.forEach((column) => {
    issues.push({
      id: `header-${column}`,
      field: column,
      message: `The required column "${column}" was not found in the first worksheet.`,
      severity: "ERROR",
    });
  });

  const resolvedColumns = requiredColumns.reduce<Record<string, number>>((accumulator, column) => {
    const target = headers.findIndex((header) => normalizeHeader(header) === normalizeHeader(column));

    if (target >= 0) {
      accumulator[column] = target;
    }

    return accumulator;
  }, {});

  const dataRows = rows.slice(1).filter((row) => hasContent(row));
  const seenReferences = new Map<string, number>();
  const beneficiaries: Beneficiary[] = [];
  let duplicateRows = 0;
  let invalidRecords = 0;
  let validRecords = 0;

  dataRows.forEach((row, index) => {
    const normalizedRow = normalizeRow(row);
    const directRemitReference = getCellValue(normalizedRow, resolvedColumns["Direct Remit Reference"]);
    const beneficiaryName = getCellValue(normalizedRow, resolvedColumns["Beneficiary Name"]);
    const amount = getCellValue(normalizedRow, resolvedColumns["Amount"]);
    const currency = getCellValue(normalizedRow, resolvedColumns["Currency"]);
    const bankName = getCellValue(normalizedRow, resolvedColumns["Bank Name"]);
    const accountNumber = getCellValue(normalizedRow, resolvedColumns["Account Number"]);

    const referenceKey = stringifyValue(directRemitReference).trim().toLowerCase();
    const referenceSeenCount = seenReferences.get(referenceKey) ?? 0;
    const isDuplicate = Boolean(referenceKey && referenceSeenCount > 0);

    if (isDuplicate) {
      duplicateRows += 1;
      issues.push({
        id: `duplicate-${index}`,
        field: "Direct Remit Reference",
        message: `Row ${index + 2} has a duplicate Direct Remit Reference: ${stringifyValue(directRemitReference)}.`,
        severity: "WARNING",
      });
    }

    seenReferences.set(referenceKey, referenceSeenCount + 1);

    const missingValues = [
      ["Direct Remit Reference", directRemitReference],
      ["Beneficiary Name", beneficiaryName],
      ["Amount", amount],
      ["Currency", currency],
      ["Bank Name", bankName],
      ["Account Number", accountNumber],
    ].filter(([, value]) => !hasMeaningfulValue(value));

    const amountValue = stringifyValue(amount).trim();
    const numericAmount = Number(amountValue);
    const amountIsValid = amountValue.length > 0 && Number.isFinite(numericAmount);

    let status: Beneficiary["processingStatusId"] = "READY_FOR_ASSIGNMENT";

    if (missingValues.length > 0 || !amountIsValid) {
      invalidRecords += 1;
      status = "INVALID";
      issues.push({
        id: `row-${index}`,
        field: "Row Validation",
        message: `Row ${index + 2} is missing required information or contains an invalid amount.`,
        severity: "ERROR",
      });
    } else if (isDuplicate) {
      status = "MANUAL_REVIEW";
    } else {
      validRecords += 1;
    }

    const normalizedAmount = amountIsValid ? numericAmount : 0;
    beneficiaries.push({
      id: createBeneficiaryId(index),
      directRemitReference: stringifyValue(directRemitReference),
      transactionDate: "",
      beneficiaryName: stringifyValue(beneficiaryName),
      currency: stringifyValue(currency),
      amount: normalizedAmount,
      destinationCountry: "",
      bankName: stringifyValue(bankName),
      accountNumber: stringifyValue(accountNumber),
      sharedBatchId: "",
      assignedBranchId: null,
      processingStatusId: status,
      returnReasonId: status === "INVALID" ? "invalid-row" : null,
      receiptUploaded: false,
      manualReviewRequired: status === "MANUAL_REVIEW",
      manualReviewReason: status === "MANUAL_REVIEW"
        ? "Duplicate Direct Remit Reference requires manual review."
        : status === "INVALID"
          ? "Required row data is missing or invalid."
          : null,
    });
  });

  const sharedBatch = createSharedBatch(file, beneficiaries, duplicateRows);
  const summary = createValidationSummary(sharedBatch, beneficiaries);

  return {
    summary,
    issues,
    sharedBatch,
    beneficiaries,
  };
}

function createSharedBatch(file: File, beneficiaries: Beneficiary[], duplicateRows: number): SharedBatch {
  return {
    id: createBatchId(),
    reference: createBatchReference(file.name),
    fileName: file.name,
    uploadDate: new Date().toISOString(),
    uploadedByUserId: "local-validation-engine",
    totalBeneficiaries: beneficiaries.length,
    assignedBeneficiaries: 0,
    completedBeneficiaries: 0,
    returnedBeneficiaries: 0,
    duplicateReferenceCount: duplicateRows,
    manualReviewCount: beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "MANUAL_REVIEW").length,
    assignmentStatus: "UNASSIGNED",
    lifecycleStatus: "ASSIGNED",
    assignedBranchId: null,
    assignedByUserId: null,
    assignedAt: null,
    isLocked: false,
    lastReassignedByUserId: null,
    lastReassignedAt: null,
    lastReassignmentReason: null,
  };
}

function createValidationSummary(sharedBatch: SharedBatch, beneficiaries: Beneficiary[]): ExcelValidationSummary {
  const validRecords = beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "READY_FOR_ASSIGNMENT").length;
  const manualReview = beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "MANUAL_REVIEW").length;
  const invalidRecords = beneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "INVALID").length;
  const duplicates = sharedBatch.duplicateReferenceCount;
  const readyForAssignment = validRecords > 0;
  const status = invalidRecords > 0
    ? "Processed Valid Transactions Only"
    : manualReview > 0
      ? "Manual Review Required"
      : "Ready for Assignment";

  return {
    batchReference: sharedBatch.reference,
    uploadDate: sharedBatch.uploadDate,
    uploadedBy: sharedBatch.uploadedByUserId,
    totalRecords: sharedBatch.totalBeneficiaries,
    validRecords,
    manualReview,
    duplicates,
    invalidRecords,
    status,
    readyForAssignment,
    processingMode: "Process Valid Transactions Only",
    batchStatus: readyForAssignment ? "READY_FOR_ASSIGNMENT" : "PENDING_REVIEW",
  };
}

function normalizeHeader(value: string | number | Date | undefined): string {
  return stringifyValue(value).trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9]+/g, "");
}

function normalizeRow(row: unknown[]): Array<string | number | Date | undefined> {
  return row.map((cell) => cell as string | number | Date | undefined);
}

function getCellValue(row: Array<string | number | Date | undefined>, columnIndex: number): string | number | Date | undefined {
  return row[columnIndex];
}

function hasMeaningfulValue(value: string | number | Date | undefined): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  return String(value).trim().length > 0;
}

function hasContent(row: unknown[]): boolean {
  return row.some((cell) => hasMeaningfulValue(cell as string | number | Date | undefined));
}

function stringifyValue(value: string | number | Date | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function createBatchReference(fileName: string): string {
  return `DR-${fileName.replace(/\.xlsx$/i, "").replace(/[^A-Za-z0-9]+/g, "-").toUpperCase()}`;
}

function createBatchId(): string {
  return `shared-batch-${crypto.randomUUID()}`;
}

function createBeneficiaryId(index: number): string {
  return `beneficiary-${index + 1}-${crypto.randomUUID()}`;
}
