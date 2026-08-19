import { read, utils, type WorkSheet } from "xlsx";
import { parseBankField } from "./sharedBatchService";
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

/**
 * Column contract (Sprint 17 Milestone 2, DECISIONS.md DEC-013).
 *
 * Each required field lists the header labels that may supply it. The first entry is the
 * legacy name this service has always required; later entries are the real Direct Remit
 * export labels approved as the supported import contract (DEC-008). Resolution is by
 * alias, so both formats import through one code path - there is no second parser and no
 * per-format branch.
 *
 * `Bank Name` and `Account Number` are deliberately not here (Sprint 17 Milestone 3). The
 * Direct Remit export supplies both in a single composite `Bank` column
 * (`"BANK OF KHARTOUM (Acc No: 4734114)"`), sometimes with the bank name displaced into
 * `Dest Country` instead. Whether that composite column can supply both fields is not a
 * simple alias lookup, so it is resolved separately below, through the one shared
 * `parseBankField` (DEC-012) - the only place bank-field parsing happens.
 */
const columnAliases = {
  "Direct Remit Reference": ["Direct Remit Reference", "Payout Ref. No"],
  "Beneficiary Name": ["Beneficiary Name", "Receiver Name"],
  "Amount": ["Amount", "FC Amount"],
  "Currency": ["Currency", "CCY"],
} as const satisfies Record<string, readonly string[]>;

type RequiredColumn = keyof typeof columnAliases;

const requiredColumns = Object.keys(columnAliases) as RequiredColumn[];

/**
 * Labels that identify a header row (Sprint 17 Milestone 1).
 *
 * Every alias above, plus the columns Milestone 3 resolves separately (`Bank Name`,
 * `Account Number`, `Bank`, `Dest Country`) and the column Milestone 4 will capture
 * (`Date`). Listed here so a header row is recognised regardless of which contract's
 * columns it carries, independent of how each column is later resolved to a field.
 */
const headerLabels: readonly string[] = [
  ...Object.values(columnAliases).flat(),
  "Bank Name",
  "Account Number",
  "Date",
  "Dest Country",
  "Bank",
];

/**
 * A row is treated as a header when it carries at least two recognised labels.
 *
 * Two rather than one is deliberate: the real file contains beneficiary bank cells whose
 * entire value is the word "Bank", and a single-label match would misread those data rows
 * as headers and silently drop them.
 */
const minimumHeaderLabelMatches = 2;

/**
 * A safety ceiling, not a real-world usage limit - checked before `arrayBuffer()` so an
 * oversized file is rejected before it's fully read into memory and parsed, rather than
 * after. 25MB comfortably covers even a very large Direct Remit export.
 */
const maxExcelFileSizeBytes = 25 * 1024 * 1024;

export async function validateExcelUpload(file: File, uploadedByUserId: string): Promise<ExcelValidationResult> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Only .xlsx files are supported.");
  }

  if (file.size > maxExcelFileSizeBytes) {
    throw new Error(`File is too large - Shared Batch uploads must be ${maxExcelFileSizeBytes / (1024 * 1024)}MB or smaller.`);
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

  // Sprint 17 M1: the header is located rather than assumed to be the first row. Real
  // Direct Remit exports carry leading blank rows above the header.
  const headerRowIndex = findHeaderRowIndex(rows);
  const headers = normalizeRow(rows[headerRowIndex] ?? []);
  const issues: ExcelValidationIssue[] = [];

  // Sprint 17 M2: resolve each required field through its aliases, so the legacy format
  // and the approved Direct Remit export both import through one path.
  const resolvedColumns = requiredColumns.reduce<Partial<Record<RequiredColumn, number>>>(
    (accumulator, column) => {
      const target = findColumnIndex(headers, column);

      if (target >= 0) {
        accumulator[column] = target;
      }

      return accumulator;
    },
    {},
  );

  const missingColumns = requiredColumns.filter((column) => resolvedColumns[column] === undefined);

  missingColumns.forEach((column) => {
    issues.push({
      id: `header-${column}`,
      field: column,
      message: `The required column "${column}" was not found in the first worksheet.`,
      severity: "ERROR",
    });
  });

  /**
   * Bank field resolution (Sprint 17 Milestone 3, DEC-012).
   *
   * Two column shapes are recognised. `Bank Name` + `Account Number` present together is
   * the legacy pre-split shape - read directly, nothing to parse. Otherwise, a `Bank`
   * column is the Direct Remit composite shape, resolved per row through parseBankField;
   * `Dest Country` supplies the fallback bank name for rows where it is displaced there
   * (Layout B). A file with neither shape reports both columns missing, exactly as the
   * legacy-only contract always has.
   */
  const bankNameColumnIndex = findSingleColumnIndex(headers, "Bank Name");
  const accountNumberColumnIndex = findSingleColumnIndex(headers, "Account Number");
  const bankColumnIndex = findSingleColumnIndex(headers, "Bank");
  const destCountryColumnIndex = findSingleColumnIndex(headers, "Dest Country");

  /**
   * Transaction date resolution (Sprint 17 Milestone 4, DEC-011).
   *
   * Not a required column - DEC-011 only asks that the date be captured when the export
   * provides one, not that its absence invalidate a row. A file with no Date column, or a
   * cell that does not parse as DD/MM/YYYY, leaves transactionDate as "", exactly the
   * behaviour every file had before this milestone.
   */
  const dateColumnIndex = findSingleColumnIndex(headers, "Date");
  const bankColumns: BankFieldColumns = {
    bankNameColumnIndex,
    accountNumberColumnIndex,
    bankColumnIndex,
    destCountryColumnIndex,
  };

  const hasSplitBankColumns = bankNameColumnIndex !== undefined && accountNumberColumnIndex !== undefined;
  const hasCombinedBankColumn = bankColumnIndex !== undefined;

  if (!hasSplitBankColumns && !hasCombinedBankColumn) {
    issues.push({
      id: "header-Bank Name",
      field: "Bank Name",
      message: `The required column "Bank Name" was not found in the first worksheet.`,
      severity: "ERROR",
    });
    issues.push({
      id: "header-Account Number",
      field: "Account Number",
      message: `The required column "Account Number" was not found in the first worksheet.`,
      severity: "ERROR",
    });
  }

  /**
   * Everything below the header, minus the noise a paginated report export carries.
   *
   * M1 removed blank spacer rows and the header repeated at each page break. M2 adds
   * structural transaction detection (DEC-013): a row is a transaction only if it carries
   * a transaction identifier. That is what excludes the `TOTAL` subtotal rows the export
   * writes at each page break - identified by the absence of a reference, never by
   * matching the display text "TOTAL", which is presentation and may be localised.
   *
   * Each entry keeps its true 1-based spreadsheet row number so a validation issue points
   * at the row the operator actually sees in Excel; the previous code derived the number
   * from the filtered array index, which drifted as soon as any row was skipped.
   */
  const referenceColumnIndex = resolvedColumns["Direct Remit Reference"];
  const dataRows = rows
    .slice(headerRowIndex + 1)
    .map((row, offset) => ({
      row: normalizeRow(row),
      rowNumber: headerRowIndex + offset + 2,
    }))
    .filter(
      (entry) =>
        hasContent(entry.row) &&
        !isHeaderRow(entry.row) &&
        isTransactionRow(entry.row, referenceColumnIndex),
    );
  const seenReferences = new Map<string, number>();
  const beneficiaries: Beneficiary[] = [];
  let duplicateRows = 0;

  dataRows.forEach(({ row: normalizedRow, rowNumber }, index) => {
    const directRemitReference = getCellValue(normalizedRow, resolvedColumns["Direct Remit Reference"]);
    const beneficiaryName = getCellValue(normalizedRow, resolvedColumns["Beneficiary Name"]);
    const amount = getCellValue(normalizedRow, resolvedColumns["Amount"]);
    const currency = getCellValue(normalizedRow, resolvedColumns["Currency"]);
    const { bankName, accountNumber } = resolveBankFields(normalizedRow, bankColumns);
    const transactionDate = parseTransactionDate(getCellValue(normalizedRow, dateColumnIndex));

    const referenceKey = stringifyValue(directRemitReference).trim().toLowerCase();
    const referenceSeenCount = seenReferences.get(referenceKey) ?? 0;
    const isDuplicate = Boolean(referenceKey && referenceSeenCount > 0);

    if (isDuplicate) {
      duplicateRows += 1;
      issues.push({
        id: `duplicate-${index}`,
        field: "Direct Remit Reference",
        message: `Row ${rowNumber} has a duplicate Direct Remit Reference: ${stringifyValue(directRemitReference)}.`,
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

    // Sprint 17 M2: tolerant parsing only. The validation rule is unchanged - an amount is
    // valid when it is present and finite - but the raw text is now normalised first, so
    // the export's padded, comma-separated values parse instead of failing as NaN.
    const { isValid: amountIsValid, amount: numericAmount } = parseAmountValue(amount);

    let status: Beneficiary["processingStatusId"] = "READY_FOR_ASSIGNMENT";

    if (missingValues.length > 0 || !amountIsValid) {
      status = "INVALID";
      issues.push({
        id: `row-${index}`,
        field: "Row Validation",
        message: `Row ${rowNumber} is missing required information or contains an invalid amount.`,
        severity: "ERROR",
      });
    } else if (isDuplicate) {
      status = "MANUAL_REVIEW";
    }

    const normalizedAmount = amountIsValid ? numericAmount : 0;
    beneficiaries.push({
      id: createBeneficiaryId(index),
      directRemitReference: stringifyValue(directRemitReference),
      transactionDate,
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

  const sharedBatch = createSharedBatch(file, beneficiaries, duplicateRows, uploadedByUserId);
  const summary = createValidationSummary(sharedBatch, beneficiaries);

  return {
    summary,
    issues,
    sharedBatch,
    beneficiaries,
  };
}

function createSharedBatch(file: File, beneficiaries: Beneficiary[], duplicateRows: number, uploadedByUserId: string): SharedBatch {
  return {
    id: createBatchId(),
    reference: createBatchReference(file.name),
    fileName: file.name,
    uploadDate: new Date().toISOString(),
    uploadedByUserId,
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

/**
 * Resolves a required field to a column index by trying each of its aliases
 * (Sprint 17 Milestone 2). Returns -1 when no alias is present in the header.
 */
function findColumnIndex(
  headers: Array<string | number | Date | undefined>,
  column: RequiredColumn,
): number {
  const aliases = columnAliases[column] as readonly string[];

  return headers.findIndex((header) => {
    const normalized = normalizeHeader(header);

    return normalized.length > 0 && aliases.some((alias) => normalizeHeader(alias) === normalized);
  });
}

/**
 * Resolves a single column label to an index, or undefined when absent
 * (Sprint 17 Milestone 3). Used for the bank-field columns, which are not a simple alias
 * lookup - which columns are even relevant depends on which shape the file uses - so they
 * are not part of `columnAliases`.
 */
function findSingleColumnIndex(
  headers: Array<string | number | Date | undefined>,
  label: string,
): number | undefined {
  const target = headers.findIndex((header) => normalizeHeader(header) === normalizeHeader(label));

  return target === -1 ? undefined : target;
}

type BankFieldColumns = {
  bankNameColumnIndex: number | undefined;
  accountNumberColumnIndex: number | undefined;
  bankColumnIndex: number | undefined;
  destCountryColumnIndex: number | undefined;
};

/**
 * Resolves bankName and accountNumber for one row (Sprint 17 Milestone 3, DEC-012).
 *
 * Two column shapes, both ending up through the same parser where parsing is actually
 * needed:
 * - **Legacy** - Bank Name and Account Number arrive pre-split in two columns. Read
 *   directly; there is nothing to parse.
 * - **Direct Remit** - both values arrive in one Bank column
 *   (`"BANK OF KHARTOUM (Acc No: 4734114)"`), or the Bank column holds a bare account
 *   number with the bank name displaced into Dest Country. Both variants are handled by
 *   the single shared `parseBankField` (DEC-012); this function does no parsing of its own,
 *   it only decides which columns to hand it.
 */
function resolveBankFields(
  row: Array<string | number | Date | undefined>,
  columns: BankFieldColumns,
): { bankName: string; accountNumber: string } {
  if (columns.bankNameColumnIndex !== undefined && columns.accountNumberColumnIndex !== undefined) {
    return {
      bankName: stringifyValue(getCellValue(row, columns.bankNameColumnIndex)),
      accountNumber: stringifyValue(getCellValue(row, columns.accountNumberColumnIndex)),
    };
  }

  if (columns.bankColumnIndex !== undefined) {
    const bankCell = stringifyValue(getCellValue(row, columns.bankColumnIndex));
    const fallbackBankName = stringifyValue(getCellValue(row, columns.destCountryColumnIndex));

    return parseBankField(bankCell, fallbackBankName);
  }

  return { bankName: "", accountNumber: "" };
}

/**
 * A row is a transaction only when it carries a transaction identifier
 * (Sprint 17 Milestone 2, DEC-013).
 *
 * This is what excludes the subtotal rows a paginated export writes at each page break:
 * they carry a label and a total but no reference. Detection is structural on purpose -
 * matching the word "TOTAL" would depend on display text that may be localised or
 * restyled at any time.
 *
 * When the reference column is absent entirely, every row is kept so the existing
 * missing-data validation still reports them rather than the file silently importing as
 * empty.
 */
function isTransactionRow(
  row: Array<string | number | Date | undefined>,
  referenceColumnIndex: number | undefined,
): boolean {
  if (referenceColumnIndex === undefined) {
    return true;
  }

  return hasMeaningfulValue(getCellValue(row, referenceColumnIndex));
}

/**
 * Parses an amount tolerantly (Sprint 17 Milestone 2).
 *
 * Accepts the padding and thousands separators the Direct Remit export writes
 * (`" 4,118,002 "`), including non-breaking and narrow no-break spaces, which Excel
 * exports use in numeric columns. The decimal point is preserved.
 *
 * This changes only how the text is read. The business rule is untouched: an amount is
 * valid when it is present and finite, exactly as before.
 */
function parseAmountValue(value: string | number | Date | undefined): { isValid: boolean; amount: number } {
  const raw = stringifyValue(value).trim();

  if (raw.length === 0) {
    return { isValid: false, amount: 0 };
  }

  const normalized = raw.replace(/[\s  ]/g, "").replace(/,/g, "");
  const parsed = Number(normalized);

  if (normalized.length === 0 || !Number.isFinite(parsed)) {
    return { isValid: false, amount: 0 };
  }

  return { isValid: true, amount: parsed };
}

/**
 * Parses the export's Date column (Sprint 17 Milestone 4, DEC-011).
 *
 * The source format is DD/MM/YYYY. Strictly validated with a round-trip check (so 31/02
 * does not silently become 03/03) and converted to ISO (YYYY-MM-DD) - the format every
 * downstream consumer already assumes: reportService/reportingProjectionService compare
 * transactionDate with plain string ordering (compareDescending), and dashboardService
 * parses it with `new Date(...)`. Neither works correctly against DD/MM/YYYY text.
 *
 * Returns "" - the existing, already-handled value - for an absent column, an empty cell,
 * or anything that does not parse. This does not invalidate the row; DEC-011 only asks
 * that the date be captured when present.
 */
function parseTransactionDate(value: string | number | Date | undefined): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : toIsoDate(value);
  }

  const raw = stringifyValue(value).trim();

  if (raw.length === 0) {
    return "";
  }

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (!match) {
    return "";
  }

  const [, day, month, year] = match;
  const parsedDay = Number(day);
  const parsedMonth = Number(month);
  const parsedDate = new Date(Number(year), parsedMonth - 1, parsedDay);

  const isValidCalendarDate = !Number.isNaN(parsedDate.getTime())
    && parsedDate.getDate() === parsedDay
    && parsedDate.getMonth() === parsedMonth - 1;

  return isValidCalendarDate ? toIsoDate(parsedDate) : "";
}

function toIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Locates the header row (Sprint 17 Milestone 1).
 *
 * Real Direct Remit exports place the header below one or more blank rows, so the first
 * row of the sheet is not the header. Falls back to row 0 when no recognised header is
 * found, which preserves the previous behaviour for any file this service already handled.
 */
function findHeaderRowIndex(rows: Array<Array<string | number | Date | undefined>>): number {
  const index = rows.findIndex((row) => isHeaderRow(normalizeRow(row)));

  return index === -1 ? 0 : index;
}

/**
 * True when a row carries at least `minimumHeaderLabelMatches` recognised header labels.
 *
 * Used both to find the header and to skip the copies a paginated export repeats at each
 * page break - in the approved Direct Remit contract the header recurs mid-sheet, and
 * treating those copies as transactions produced phantom invalid records.
 */
function isHeaderRow(row: Array<string | number | Date | undefined>): boolean {
  const matches = row.filter((cell) => {
    const normalized = normalizeHeader(cell);

    return normalized.length > 0 && headerLabels.some((label) => normalizeHeader(label) === normalized);
  });

  return matches.length >= minimumHeaderLabelMatches;
}

function normalizeHeader(value: string | number | Date | undefined): string {
  return stringifyValue(value).trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9]+/g, "");
}

function normalizeRow(row: unknown[]): Array<string | number | Date | undefined> {
  return row.map((cell) => cell as string | number | Date | undefined);
}

/**
 * Reads a cell by resolved column index. The index is optional because a required column
 * may be absent from the file (Sprint 17 M2 resolves columns by alias, and an unresolved
 * column stays undefined); an absent column reads as an empty cell, which the existing
 * missing-value validation then reports.
 */
function getCellValue(
  row: Array<string | number | Date | undefined>,
  columnIndex: number | undefined,
): string | number | Date | undefined {
  return columnIndex === undefined ? undefined : row[columnIndex];
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
