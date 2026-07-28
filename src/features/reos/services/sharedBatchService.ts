import type { Beneficiary } from "../types/beneficiary";
import type { SharedBatch } from "../types/sharedBatch";
import type {
  BankParseResult,
  DirectRemitBatchRow,
  SharedBatchImportResult,
  SharedBatchValidationIssue,
} from "../types/sharedBatchImport";

type CsvRecord = Record<string, string>;

type ImportSharedBatchInput = {
  fileName: string;
  fileContent: string;
  uploadedByUserId: string;
};

const requiredColumns = [
  "Direct Remit Reference",
  "Transaction Date",
  "Beneficiary Name",
  "Currency",
  "Amount",
  "Destination Country",
  "Bank",
];

export function parseBankField(bankField: string): BankParseResult {
  const normalizedBankField = bankField.trim();
  const accountMatch = normalizedBankField.match(/^(.*?)[\s|,;:/-]+([A-Za-z0-9][A-Za-z0-9-]{4,})$/);

  if (!accountMatch) {
    return {
      bankName: normalizedBankField,
      accountNumber: "",
    };
  }

  return {
    bankName: accountMatch[1].trim(),
    accountNumber: accountMatch[2].trim(),
  };
}

export function importSharedBatch(input: ImportSharedBatchInput): SharedBatchImportResult {
  const records = parseCsv(input.fileContent);
  const validationIssues = validateRequiredColumns(records.headers);
  const duplicateReferences = findDuplicateReferences(records.rows);
  const beneficiaries = records.rows.map((record, index) => {
    return mapRecordToBeneficiary(record, index, records.sharedBatchId, duplicateReferences, validationIssues);
  });
  const duplicateReferenceCount = beneficiaries.filter((beneficiary) => beneficiary.manualReviewRequired).length;
  const sharedBatch = createSharedBatch(input, records.sharedBatchId, beneficiaries, duplicateReferenceCount);

  return {
    sharedBatch,
    beneficiaries,
    validationIssues,
    canCreateSharedBatch: validationIssues.every((issue) => issue.severity !== "ERROR"),
  };
}

function parseCsv(fileContent: string): { headers: string[]; rows: CsvRecord[]; sharedBatchId: string } {
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers = lines[0] ? parseCsvLine(lines[0]).map((header) => header.trim()) : [];
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<CsvRecord>((record, header, index) => {
      record[header] = values[index]?.trim() ?? "";
      return record;
    }, {});
  });

  return {
    headers,
    rows,
    sharedBatchId: createImportId("shared-batch"),
  };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let insideQuotes = false;

  for (const character of line) {
    if (character === "\"") {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
}

function validateRequiredColumns(headers: string[]): SharedBatchValidationIssue[] {
  return requiredColumns
    .filter((column) => !headers.includes(column))
    .map((column) => ({
      rowNumber: 1,
      field: column,
      message: `${column} column is required.`,
      severity: "ERROR",
    }));
}

function findDuplicateReferences(rows: CsvRecord[]): Set<string> {
  const counts = rows.reduce<Record<string, number>>((referenceCounts, row) => {
    const reference = row["Direct Remit Reference"]?.trim();

    if (reference) {
      referenceCounts[reference] = (referenceCounts[reference] ?? 0) + 1;
    }

    return referenceCounts;
  }, {});

  return new Set(Object.entries(counts).filter(([, count]) => count > 1).map(([reference]) => reference));
}

function mapRecordToBeneficiary(
  record: CsvRecord,
  rowIndex: number,
  sharedBatchId: string,
  duplicateReferences: Set<string>,
  validationIssues: SharedBatchValidationIssue[],
): Beneficiary {
  const directRemitReference = record["Direct Remit Reference"] ?? "";
  const bank = parseBankField(record.Bank ?? "");
  const rowNumber = rowIndex + 2;
  const row = mapRecordToDirectRemitRow(record);

  validateRow(row, bank, rowNumber, duplicateReferences, validationIssues);

  return {
    id: createImportId(`beneficiary-${rowNumber}`),
    directRemitReference: row.directRemitReference,
    transactionDate: row.transactionDate,
    beneficiaryName: row.beneficiaryName,
    currency: row.currency,
    amount: row.amount,
    destinationCountry: row.destinationCountry,
    bankName: bank.bankName,
    accountNumber: bank.accountNumber,
    sharedBatchId,
    assignedBranchId: null,
    processingStatusId: "",
    returnReasonId: null,
    receiptUploaded: false,
    manualReviewRequired: duplicateReferences.has(directRemitReference),
    manualReviewReason: duplicateReferences.has(directRemitReference)
      ? "Duplicate Direct Remit Reference requires manual review."
      : null,
  };
}

function mapRecordToDirectRemitRow(record: CsvRecord): DirectRemitBatchRow {
  return {
    directRemitReference: record["Direct Remit Reference"] ?? "",
    transactionDate: record["Transaction Date"] ?? "",
    beneficiaryName: record["Beneficiary Name"] ?? "",
    currency: record.Currency ?? "",
    amount: Number(record.Amount ?? 0),
    destinationCountry: record["Destination Country"] ?? "",
    bank: record.Bank ?? "",
  };
}

function validateRow(
  row: DirectRemitBatchRow,
  bank: BankParseResult,
  rowNumber: number,
  duplicateReferences: Set<string>,
  validationIssues: SharedBatchValidationIssue[],
) {
  if (!row.directRemitReference) {
    validationIssues.push(createRowIssue(rowNumber, "Direct Remit Reference", "Direct Remit Reference is required.", "ERROR"));
  }

  if (!Number.isFinite(row.amount) || row.amount <= 0) {
    validationIssues.push(createRowIssue(rowNumber, "Amount", "Amount must be greater than zero.", "ERROR"));
  }

  if (!bank.bankName || !bank.accountNumber) {
    validationIssues.push(createRowIssue(rowNumber, "Bank", "Bank field must include bank name and account number.", "ERROR"));
  }

  if (duplicateReferences.has(row.directRemitReference)) {
    validationIssues.push(
      createRowIssue(
        rowNumber,
        "Direct Remit Reference",
        "Duplicate Direct Remit Reference imported and flagged for manual review.",
        "WARNING",
      ),
    );
  }
}

function createRowIssue(
  rowNumber: number,
  field: string,
  message: string,
  severity: SharedBatchValidationIssue["severity"],
): SharedBatchValidationIssue {
  return {
    rowNumber,
    field,
    message,
    severity,
  };
}

function createSharedBatch(
  input: ImportSharedBatchInput,
  sharedBatchId: string,
  beneficiaries: Beneficiary[],
  duplicateReferenceCount: number,
): SharedBatch {
  return {
    id: sharedBatchId,
    reference: createBatchReference(input.fileName),
    fileName: input.fileName,
    uploadDate: new Date().toISOString(),
    uploadedByUserId: input.uploadedByUserId,
    totalBeneficiaries: beneficiaries.length,
    assignedBeneficiaries: 0,
    completedBeneficiaries: 0,
    returnedBeneficiaries: 0,
    duplicateReferenceCount,
    manualReviewCount: duplicateReferenceCount,
    assignmentStatus: "UNASSIGNED",
    assignedBranchId: null,
    assignedByUserId: null,
    assignedAt: null,
    isLocked: false,
    lastReassignedByUserId: null,
    lastReassignedAt: null,
    lastReassignmentReason: null,
  };
}

function createBatchReference(fileName: string): string {
  return `DR-${fileName.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9]+/g, "-").toUpperCase()}`;
}

function createImportId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
