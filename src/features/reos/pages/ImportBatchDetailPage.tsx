import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DataTable } from "../components/common/DataTable";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { ImportRecordSummary } from "../components/ImportRecordSummary";
import { getImportDetail } from "../services/operationalDatasetService";
import { colors, radius, spacing, typography } from "../theme";
import type { ImportBeneficiaryRecord } from "../types/importIntelligence";
import type { ImportDetail } from "../types/operationalDataset";

/** Import History's "link to imported dataset" - one batch, and every beneficiary durably recorded against it. */
export function ImportBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) {
      return;
    }

    let cancelled = false;

    getImportDetail(batchId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (!result) {
          setNotFound(true);
          return;
        }

        setDetail(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load this import.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  return (
    <PageContainer>
      <PageHeader
        actions={
          <Link style={{ color: colors.primary, fontSize: typography.small, fontWeight: 600 }} to="/reos/import-intelligence/history">
            Back to Import History
          </Link>
        }
        description={
          detail
            ? `${detail.batch.fileName} - uploaded ${new Date(detail.batch.uploadTimestamp).toLocaleString()} by ${detail.batch.uploadedByUserId}`
            : "One durably-recorded import and every beneficiary imported with it."
        }
        title={detail ? detail.batch.batchReference : "Import Detail"}
      />

      {error ? (
        <div style={{ backgroundColor: colors.red50, border: "1px solid #FCA5A5", borderRadius: radius.sm, color: colors.red700, padding: spacing.lg }}>{error}</div>
      ) : null}

      {notFound ? <EmptyState message="This import could not be found." /> : null}

      {!detail && !notFound && !error ? <LoadingState message="Loading import..." /> : null}

      {detail ? (
        <>
          <ImportRecordSummary batch={detail.batch} />
          {detail.beneficiaries.length === 0 ? (
            <EmptyState message="No beneficiaries are recorded against this import." />
          ) : (
            <DataTable
              columns={[
                { key: "directRemitReference", header: "Reference", render: (row: ImportBeneficiaryRecord) => row.directRemitReference },
                { key: "beneficiaryName", header: "Beneficiary", render: (row: ImportBeneficiaryRecord) => row.beneficiaryName },
                { key: "businessDate", header: "Business Date", render: (row: ImportBeneficiaryRecord) => row.businessDate ?? "—" },
                { key: "amount", header: "Amount", align: "right", render: (row: ImportBeneficiaryRecord) => `${row.amount.toLocaleString()} ${row.currency}` },
                { key: "bankName", header: "Bank", render: (row: ImportBeneficiaryRecord) => row.bankName ?? "—" },
                { key: "accountNumber", header: "Account", render: (row: ImportBeneficiaryRecord) => row.accountNumber ?? "—" },
              ]}
              getRowKey={(row: ImportBeneficiaryRecord) => row.id}
              rows={detail.beneficiaries}
            />
          )}
        </>
      ) : null}
    </PageContainer>
  );
}

