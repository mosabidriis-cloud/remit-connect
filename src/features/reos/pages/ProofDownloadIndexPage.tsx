import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BatchLifecycleBadge } from "../components/BatchLifecycleBadge";
import { EmptyState } from "../components/common/EmptyState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { getAllSharedBatches } from "../services/sharedBatchStore";
import { colors, radius, spacing, typography } from "../theme";
import type { SharedBatch } from "../types/sharedBatch";

/**
 * The real entry point behind the "Proof Download" sidebar item, which otherwise links
 * to a literal, unresolved "BATCH_ID" placeholder (Sidebar.tsx only substitutes
 * BRANCH_ID). Lists every Shared Batch that has reached a branch, newest first, so a
 * Direct Remit Officer can open one and see completed transactions/proofs as they land
 * without already knowing a specific batch reference to search for.
 */
export function ProofDownloadIndexPage() {
  const [batches, setBatches] = useState<SharedBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAllSharedBatches()
      .then((allBatches) => {
        if (!cancelled) {
          const assignedBatches = allBatches
            .filter((batch) => Boolean(batch.assignedBranchId))
            .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

          setBatches(assignedBatches);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Unable to load Shared Batches.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContainer>
      <PageHeader
        description="Open an assigned Shared Batch to view completed transactions and download proofs as they finish."
        title="Proof Download"
      />
      {error ? (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#B91C1C", padding: 16 }}>
          {error}
        </div>
      ) : null}
      {loading ? (
        <EmptyState message="Loading..." />
      ) : batches.length === 0 ? (
        <EmptyState message="No Shared Batches have been assigned to a branch yet." />
      ) : (
        <div style={{ display: "grid", gap: spacing.sm }}>
          {batches.map((batch) => (
            <Link
              key={batch.id}
              to={`/reos/shared-batches/${batch.id}/proof-download`}
              style={{
                alignItems: "center",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                display: "flex",
                gap: spacing.sm,
                justifyContent: "space-between",
                padding: `${spacing.sm}px ${spacing.md}px`,
                textDecoration: "none",
              }}
            >
              <div>
                <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{batch.reference}</div>
                <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                  {batch.fileName} • {batch.assignedBranchId} • {batch.totalBeneficiaries} beneficiaries
                </div>
              </div>
              <BatchLifecycleBadge status={batch.lifecycleStatus} />
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
