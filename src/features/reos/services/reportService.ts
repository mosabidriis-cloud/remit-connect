import type {
  BranchBatchReportRow,
  ReportDefinition,
  ReportFilter,
  ReportResult,
  ReportSourceData,
  SharedBatchReportRow,
  TransactionReportRow,
  VolumeReportRow,
} from "../types/report";
import type { SharedBatch, SharedBatchLifecycleStatus } from "../types/sharedBatch";
import type { CreditToAccountTransaction } from "../types/transactionProcessing";

const volumeReportDefinitions: ReportDefinition[] = [
  {
    id: "volume-shared-batches",
    name: "Shared Batches",
    category: "VOLUME",
    type: "SHARED_BATCHES",
    format: "TABLE",
    description: "How many Shared Batches are in REOS operations?",
    columns: [
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "status", title: "Lifecycle Status", sortable: true },
      { key: "transactionCount", title: "Transactions", sortable: true },
      { key: "completedCount", title: "Completed", sortable: true },
      { key: "returnedCount", title: "Returned", sortable: true },
      { key: "date", title: "Upload Date", sortable: true },
    ],
  },
  {
    id: "volume-transactions",
    name: "Transactions",
    category: "VOLUME",
    type: "TRANSACTIONS",
    format: "TABLE",
    description: "How many Credit-to-Account transactions are in branch operations?",
    columns: [
      { key: "transactionReference", title: "Direct Remit Reference", sortable: true },
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "beneficiaryName", title: "Beneficiary", sortable: true },
      { key: "status", title: "Transaction Status", sortable: true },
      { key: "proofCount", title: "Proofs", sortable: true },
      { key: "date", title: "Transaction Date", sortable: true },
    ],
  },
  {
    id: "volume-completed-transactions",
    name: "Completed Transactions",
    category: "VOLUME",
    type: "COMPLETED_TRANSACTIONS",
    format: "TABLE",
    description: "How many transactions have been completed by branch operations?",
    columns: [
      { key: "transactionReference", title: "Direct Remit Reference", sortable: true },
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "beneficiaryName", title: "Beneficiary", sortable: true },
      { key: "proofCount", title: "Proofs", sortable: true },
      { key: "date", title: "Completed At", sortable: true },
    ],
  },
  {
    id: "volume-returned-transactions",
    name: "Returned Transactions",
    category: "VOLUME",
    type: "RETURNED_TRANSACTIONS",
    format: "TABLE",
    description: "How many transactions have been returned by branch operations?",
    columns: [
      { key: "transactionReference", title: "Direct Remit Reference", sortable: true },
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "beneficiaryName", title: "Beneficiary", sortable: true },
      { key: "status", title: "Transaction Status", sortable: true },
      { key: "date", title: "Returned At", sortable: true },
    ],
  },
  {
    id: "volume-ready-for-download-batches",
    name: "Ready For Download Batches",
    category: "VOLUME",
    type: "READY_FOR_DOWNLOAD_BATCHES",
    format: "TABLE",
    description: "How many Shared Batches are ready for Direct Remit proof download?",
    columns: [
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "status", title: "Lifecycle Status", sortable: true },
      { key: "transactionCount", title: "Transactions", sortable: true },
      { key: "completedCount", title: "Completed", sortable: true },
      { key: "returnedCount", title: "Returned", sortable: true },
      { key: "date", title: "Upload Date", sortable: true },
    ],
  },
  {
    id: "volume-downloaded-batches",
    name: "Downloaded Batches",
    category: "VOLUME",
    type: "DOWNLOADED_BATCHES",
    format: "TABLE",
    description: "How many Shared Batches have completed the REOS download workflow?",
    columns: [
      { key: "batchReference", title: "Batch Reference", sortable: true },
      { key: "branchId", title: "Branch", sortable: true },
      { key: "status", title: "Lifecycle Status", sortable: true },
      { key: "transactionCount", title: "Transactions", sortable: true },
      { key: "completedCount", title: "Completed", sortable: true },
      { key: "returnedCount", title: "Returned", sortable: true },
      { key: "date", title: "Upload Date", sortable: true },
    ],
  },
];

export class ReportService {
  private readonly reports: ReportDefinition[] = [...volumeReportDefinitions];

  register(definition: ReportDefinition): void {
    const exists = this.reports.some((r) => r.id === definition.id);

    if (exists) {
      throw new Error(`Report '${definition.id}' is already registered.`);
    }

    this.reports.push(definition);
  }

  getDefinitions(): ReportDefinition[] {
    return [...this.reports];
  }

  getDefinition(id: string): ReportDefinition | undefined {
    return this.reports.find((r) => r.id === id);
  }

  validateFilters(filters: ReportFilter): boolean {
    if (!filters.reportType) {
      return false;
    }

    if (
      filters.fromDate &&
      filters.toDate &&
      filters.fromDate > filters.toDate
    ) {
      return false;
    }

    return true;
  }

  createVolumeReportResult(
    sourceData: ReportSourceData,
    filters: ReportFilter,
  ): ReportResult<VolumeReportRow> {
    const definition = this.getDefinitionByType(filters.reportType);

    if (!definition || definition.category !== "VOLUME") {
      throw new Error("A registered Volume Report definition is required.");
    }

    const rows = this.getVolumeRows(definition, sourceData, filters);
    const metrics = this.getVolumeMetrics(filters.reportType, rows);

    return {
      definition,
      filters,
      metrics,
      rows,
      totals: metrics,
      generatedAt: new Date().toISOString(),
    };
  }

  createSharedBatchResult(
    definition: ReportDefinition,
    filters: ReportFilter,
    rows: SharedBatchReportRow[],
  ): ReportResult<SharedBatchReportRow> {
    return {
      definition,
      filters,
      metrics: [],
      rows,
      totals: [],
      generatedAt: new Date().toISOString(),
    };
  }

  createTransactionResult(
    definition: ReportDefinition,
    filters: ReportFilter,
    rows: TransactionReportRow[],
  ): ReportResult<TransactionReportRow> {
    return {
      definition,
      filters,
      metrics: [],
      rows,
      totals: [],
      generatedAt: new Date().toISOString(),
    };
  }

  createBranchBatchResult(
    definition: ReportDefinition,
    filters: ReportFilter,
    rows: BranchBatchReportRow[],
  ): ReportResult<BranchBatchReportRow> {
    return {
      definition,
      filters,
      metrics: [],
      rows,
      totals: [],
      generatedAt: new Date().toISOString(),
    };
  }

  private getDefinitionByType(reportType: ReportFilter["reportType"]): ReportDefinition | undefined {
    return this.reports.find((report) => report.type === reportType);
  }

  private getVolumeRows(
    definition: ReportDefinition,
    sourceData: ReportSourceData,
    filters: ReportFilter,
  ): VolumeReportRow[] {
    if (isBatchReport(definition.type)) {
      const lifecycleStatus = getBatchReportLifecycleStatus(definition.type);
      const batches = lifecycleStatus
        ? (sourceData.sharedBatches ?? []).filter((batch) => batch.lifecycleStatus === lifecycleStatus)
        : sourceData.sharedBatches ?? [];

      return batches
        .map(mapSharedBatchToRow)
        .filter((row) => matchesFilters(row, filters))
        .sort((first, second) => second.date.localeCompare(first.date));
    }

    const status = getTransactionReportStatus(definition.type);
    const rows = (sourceData.processingBatches ?? []).flatMap((batch) =>
      batch.transactions
        .filter((transaction) => !status || transaction.status === status)
        .map((transaction) => mapTransactionToRow(transaction, batch.reference, batch.assignedBranchId, definition.type)),
    );

    return rows
      .filter((row) => matchesFilters(row, filters))
      .sort((first, second) => second.date.localeCompare(first.date));
  }

  private getVolumeMetrics(
    reportType: ReportFilter["reportType"],
    rows: VolumeReportRow[],
  ) {
    if (isBatchReport(reportType)) {
      return [
        {
          label: getBatchMetricLabel(reportType),
          value: rows.length,
        },
        {
          label: "Total Transactions",
          value: rows.reduce((total, row) => total + Number(row.transactionCount ?? 0), 0),
        },
        {
          label: "Completed",
          value: rows.reduce((total, row) => total + Number(row.completedCount ?? 0), 0),
        },
        {
          label: "Returned",
          value: rows.reduce((total, row) => total + Number(row.returnedCount ?? 0), 0),
        },
      ];
    }

    return [
      {
        label: getTransactionMetricLabel(reportType),
        value: rows.length,
      },
      {
        label: "Completed",
        value: rows.filter((row) => row.status === "COMPLETED").length,
      },
      {
        label: "Returned",
        value: rows.filter((row) => row.status === "RETURNED").length,
      },
      {
        label: "Proofs",
        value: rows.reduce((total, row) => total + Number(row.proofCount ?? 0), 0),
      },
    ];
  }
}

export const reportService = new ReportService();

function isBatchReport(reportType: ReportFilter["reportType"]): boolean {
  return (
    reportType === "SHARED_BATCHES" ||
    reportType === "READY_FOR_DOWNLOAD_BATCHES" ||
    reportType === "DOWNLOADED_BATCHES"
  );
}

function getBatchReportLifecycleStatus(
  reportType: ReportFilter["reportType"],
): SharedBatchLifecycleStatus | null {
  if (reportType === "READY_FOR_DOWNLOAD_BATCHES") {
    return "READY_FOR_DOWNLOAD";
  }

  if (reportType === "DOWNLOADED_BATCHES") {
    return "DOWNLOADED";
  }

  return null;
}

function getTransactionReportStatus(
  reportType: ReportFilter["reportType"],
): CreditToAccountTransaction["status"] | null {
  if (reportType === "COMPLETED_TRANSACTIONS") {
    return "COMPLETED";
  }

  if (reportType === "RETURNED_TRANSACTIONS") {
    return "RETURNED";
  }

  return null;
}

function mapSharedBatchToRow(batch: SharedBatch): VolumeReportRow {
  return {
    id: batch.id,
    batchReference: batch.reference,
    branchId: batch.assignedBranchId,
    status: batch.lifecycleStatus,
    transactionCount: batch.totalBeneficiaries,
    completedCount: batch.completedBeneficiaries,
    returnedCount: batch.returnedBeneficiaries,
    date: batch.uploadDate,
  };
}

function mapTransactionToRow(
  transaction: CreditToAccountTransaction,
  batchReference: string,
  branchId: string,
  reportType: ReportFilter["reportType"],
): VolumeReportRow {
  return {
    id: transaction.id,
    batchReference,
    branchId: transaction.beneficiary.assignedBranchId ?? branchId,
    transactionReference: transaction.beneficiary.directRemitReference,
    beneficiaryName: transaction.beneficiary.beneficiaryName,
    status: transaction.status,
    proofCount: transaction.proofs.length,
    date: getTransactionDate(transaction, reportType),
  };
}

function getTransactionDate(
  transaction: CreditToAccountTransaction,
  reportType: ReportFilter["reportType"],
): string {
  if (reportType === "COMPLETED_TRANSACTIONS") {
    return transaction.completedAt ?? transaction.beneficiary.transactionDate;
  }

  if (reportType === "RETURNED_TRANSACTIONS") {
    return transaction.returnedAt ?? transaction.beneficiary.transactionDate;
  }

  return transaction.beneficiary.transactionDate;
}

function matchesFilters(row: VolumeReportRow, filters: ReportFilter): boolean {
  const rowDate = row.date.slice(0, 10);

  if (filters.fromDate && rowDate < filters.fromDate) {
    return false;
  }

  if (filters.toDate && rowDate > filters.toDate) {
    return false;
  }

  if (filters.branchId?.trim() && row.branchId !== filters.branchId.trim()) {
    return false;
  }

  if (
    filters.batchReference?.trim() &&
    !row.batchReference.toLowerCase().includes(filters.batchReference.trim().toLowerCase())
  ) {
    return false;
  }

  return true;
}

function getBatchMetricLabel(reportType: ReportFilter["reportType"]): string {
  if (reportType === "READY_FOR_DOWNLOAD_BATCHES") {
    return "Ready For Download";
  }

  if (reportType === "DOWNLOADED_BATCHES") {
    return "Downloaded";
  }

  return "Total Shared Batches";
}

function getTransactionMetricLabel(reportType: ReportFilter["reportType"]): string {
  if (reportType === "COMPLETED_TRANSACTIONS") {
    return "Completed";
  }

  if (reportType === "RETURNED_TRANSACTIONS") {
    return "Returned";
  }

  return "Total Transactions";
}
