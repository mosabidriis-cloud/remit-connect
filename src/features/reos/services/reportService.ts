import type {
  BranchBatchReportRow,
  ReportDefinition,
  ReportFilter,
  ReportResult,
  SharedBatchReportRow,
  TransactionReportRow,
} from "../types/report";

export class ReportService {
  private readonly reports: ReportDefinition[] = [];

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
      generatedAt: new Date().toISOString(),
    };
  }
}

export const reportService = new ReportService();