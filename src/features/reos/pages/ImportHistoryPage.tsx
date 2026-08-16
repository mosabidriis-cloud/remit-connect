import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../components/common/DataTable";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getImportHistoryEntries } from "../services/operationalDatasetService";
import { colors, radius, spacing, typography } from "../theme";
import type { ImportDuplicateStatus, ImportSource } from "../types/importIntelligence";
import type { ImportHistoryEntry } from "../types/operationalDataset";

const SOURCE_OPTIONS: ImportSource[] = ["DIRECT_REMIT", "WESTERN_UNION", "RIA", "MONEYGRAM", "TERRAPAY"];
const STATUS_OPTIONS: ImportDuplicateStatus[] = ["UNIQUE", "REPLACED", "MERGED"];

const statusTone: Record<ImportDuplicateStatus, string> = {
  UNIQUE: colors.emerald700,
  REPLACED: colors.muted,
  MERGED: colors.amber700,
};

const selectStyle = { border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text, fontSize: typography.small, padding: `${spacing.xs}px ${spacing.sm}px` };

/**
 * Import History (IMPORT_INTELLIGENCE.md Section 13): every import ever recorded, most
 * recent first, driven entirely by operationalDatasetService (which reads exclusively
 * through importIntelligenceService.getImportHistory()). Filters follow the redesigned
 * hierarchy: Reporting Period / Source / Currency / Status are primary (operational
 * identity); Upload Timestamp / Import Batch / Uploader are secondary - audit fields,
 * not operational ones.
 */
export function ImportHistoryPage() {
  const [entries, setEntries] = useState<ImportHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reportingPeriod, setReportingPeriod] = useState("");
  const [source, setSource] = useState("");
  const [currency, setCurrency] = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploader, setUploader] = useState("");
  const [batchReferenceSearch, setBatchReferenceSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    getImportHistoryEntries()
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load Import History.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const periodOptions = useMemo(() => [...new Set((entries ?? []).map((entry) => entry.reportingPeriod))].sort().reverse(), [entries]);
  const currencyOptions = useMemo(
    () => [...new Set((entries ?? []).map((entry) => entry.currency).filter((value): value is string => Boolean(value)))].sort(),
    [entries],
  );

  const filtered = useMemo(() => {
    return (entries ?? []).filter((entry) => {
      if (reportingPeriod && entry.reportingPeriod !== reportingPeriod) {
        return false;
      }
      if (source && entry.source !== source) {
        return false;
      }
      if (currency && entry.currency !== currency) {
        return false;
      }
      if (duplicateStatus && entry.duplicateStatus !== duplicateStatus) {
        return false;
      }
      if (uploader && !entry.uploadedByUserId.toLowerCase().includes(uploader.toLowerCase())) {
        return false;
      }
      if (batchReferenceSearch && !entry.batchReference.toLowerCase().includes(batchReferenceSearch.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [entries, reportingPeriod, source, currency, duplicateStatus, uploader, batchReferenceSearch]);

  return (
    <PageContainer>
      <PageHeader
        description="Every import ever recorded, most recent first. Upload Timestamp and Uploader are audit fields, not operational ones."
        title="Import History"
      />

      {error ? (
        <div style={{ backgroundColor: colors.red50, border: "1px solid #FCA5A5", borderRadius: radius.sm, color: colors.red700, padding: spacing.lg }}>{error}</div>
      ) : null}

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.sm, display: "grid", gap: spacing.sm, padding: spacing.lg }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
          <select onChange={(event) => setReportingPeriod(event.target.value)} style={selectStyle} value={reportingPeriod}>
            <option value="">Reporting Period: All</option>
            {periodOptions.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
          <select onChange={(event) => setSource(event.target.value)} style={selectStyle} value={source}>
            <option value="">Source: All</option>
            {SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select onChange={(event) => setCurrency(event.target.value)} style={selectStyle} value={currency}>
            <option value="">Currency: All</option>
            {currencyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select onChange={(event) => setDuplicateStatus(event.target.value)} style={selectStyle} value={duplicateStatus}>
            <option value="">Status: All</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAdvanced((current) => !current)}
          style={{ background: "none", border: "none", color: colors.primary, cursor: "pointer", fontSize: typography.small, padding: 0, textAlign: "left" }}
          type="button"
        >
          {showAdvanced ? "Hide advanced filters" : "Advanced filters (Import Batch, Uploader)"}
        </button>

        {showAdvanced ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
            <input
              onChange={(event) => setBatchReferenceSearch(event.target.value)}
              placeholder="Import Batch Reference"
              style={selectStyle}
              type="text"
              value={batchReferenceSearch}
            />
            <input onChange={(event) => setUploader(event.target.value)} placeholder="Uploader" style={selectStyle} type="text" value={uploader} />
          </div>
        ) : null}
      </div>

      {!entries ? (
        <LoadingState message="Loading import history..." />
      ) : filtered.length === 0 ? (
        <EmptyState message={entries.length === 0 ? "No imports have been recorded yet." : "No imports match these filters."} />
      ) : (
        <DataTable
          columns={[
            { key: "batchReference", header: "Batch Reference", render: (row: ImportHistoryEntry) => <Link style={{ color: colors.primary }} to={`/reos/import-intelligence/history/${row.id}`}>{row.batchReference}</Link> },
            { key: "source", header: "Source", render: (row: ImportHistoryEntry) => row.source },
            { key: "reportingPeriod", header: "Reporting Period", render: (row: ImportHistoryEntry) => row.reportingPeriod },
            { key: "coverageImpact", header: "Coverage Impact", render: (row: ImportHistoryEntry) => (row.coverageImpact === "FIRST_FOR_PERIOD" ? "Filled a gap" : "Additional") },
            { key: "transactionCount", header: "Transactions", align: "right", render: (row: ImportHistoryEntry) => String(row.transactionCount) },
            {
              key: "validationOutcome",
              header: "Validation Outcome",
              render: (row: ImportHistoryEntry) =>
                row.validRecordCount !== null ? `${row.validRecordCount} valid / ${row.invalidRecordCount ?? 0} invalid / ${row.manualReviewRecordCount ?? 0} review` : "Not recorded",
            },
            { key: "duplicateStatus", header: "Status", render: (row: ImportHistoryEntry) => <span style={{ color: statusTone[row.duplicateStatus], fontWeight: 600 }}>{row.duplicateStatus}</span> },
            { key: "uploadTimestamp", header: "Uploaded", render: (row: ImportHistoryEntry) => new Date(row.uploadTimestamp).toLocaleString() },
            { key: "uploadedByUserId", header: "Uploaded By", render: (row: ImportHistoryEntry) => row.uploadedByUserId },
          ]}
          getRowKey={(row: ImportHistoryEntry) => row.id}
          rows={filtered}
        />
      )}
    </PageContainer>
  );
}
