import { useEffect, useState } from "react";
import { BranchAssignmentPanel } from "../components/BranchAssignmentPanel";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { recordAuditEvent } from "../services/auditService";
import { assignSharedBatchToBranch } from "../services/branchAssignmentService";
import { getBranchById } from "../services/branchRegistryService";
import { deleteSharedBatch, getAllSharedBatches, getBeneficiaries, saveAssignment, saveSharedBatch } from "../services/sharedBatchStore";
import { useReosSession } from "../layout/reosAuthContext";
import { colors, radius, spacing, typography } from "../theme";
import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type { SharedBatch } from "../types/sharedBatch";

export function BranchAssignmentPage() {
  const { session } = useReosSession();
  const [unassignedBatches, setUnassignedBatches] = useState<SharedBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<SharedBatch | null>(null);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<Beneficiary[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isAssignmentFinalized, setIsAssignmentFinalized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unassignedError, setUnassignedError] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Real, uploaded Shared Batches waiting for their initial assignment. Re-fetched after
  // every successful assignment (refreshSignal) so the just-assigned batch drops out of
  // the worklist immediately - selectedBatch is a separate piece of state so the panel
  // below keeps showing that batch's now-locked result instead of disappearing the
  // moment it falls out of this list.
  useEffect(() => {
    let cancelled = false;

    getAllSharedBatches()
      .then((batches) => {
        if (!cancelled) {
          setUnassignedBatches(batches.filter((batch) => batch.assignmentStatus === "UNASSIGNED"));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setUnassignedError(cause instanceof Error ? cause.message : "Unable to load uploaded Shared Batches.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const canDeleteBatches = session?.role === "OPERATIONS_MANAGER" || session?.role === "DIRECT_REMIT_OFFICER";

  const handleSelectBatch = (batch: SharedBatch) => {
    setError(null);
    setSelectedBatch(batch);
    setSelectedBeneficiaries([]);
    setAssignment(null);
    setIsAssignmentFinalized(false);

    getBeneficiaries(batch.id)
      .then((beneficiaries) => setSelectedBeneficiaries([...beneficiaries]))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Unable to load this batch's transactions.");
      });
  };

  const handleConfirmAssignment = async (branchId: string) => {
    if (!selectedBatch || !session) {
      return;
    }

    setError(null);

    try {
      const result = await assignSharedBatchToBranch({
        sharedBatch: selectedBatch,
        beneficiaries: selectedBeneficiaries,
        branchId,
        branchName: getBranchById(branchId)?.name ?? branchId,
        assignedByUserId: session.userId,
        actorRole: session.role,
      });

      await saveAssignment(result.assignment);
      await saveSharedBatch(result.sharedBatch);

      setSelectedBatch(result.sharedBatch);
      setAssignment(result.assignment);
      setIsAssignmentFinalized(true);
      setRefreshSignal((value) => value + 1);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to assign Shared Batch.");
    }
  };

  const handleDeleteBatch = async (batch: SharedBatch) => {
    if (!session) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteSharedBatch(batch.id);
      await recordAuditEvent({
        actorUserId: session.userId,
        action: "BATCH_DELETED",
        entityType: "SHARED_BATCH",
        entityId: batch.id,
        details: `Deleted Shared Batch ${batch.reference} (${batch.fileName}) before assignment.`,
      });

      if (selectedBatch?.id === batch.id) {
        setSelectedBatch(null);
      }

      setConfirmingDeleteId(null);
      setRefreshSignal((value) => value + 1);
    } catch (caughtError) {
      setDeleteError(caughtError instanceof Error ? caughtError.message : "Unable to delete this batch.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        description="Select an uploaded Shared Batch and assign it to a branch."
        title="Branch Assignment"
      />
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
        }}
      >
        <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Uploaded Shared Batches Ready for Assignment</div>
        {unassignedBatches.length === 0 ? (
          <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
            No uploaded Shared Batches are waiting for assignment.
          </div>
        ) : (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
            {unassignedBatches.map((batch) => (
              <div
                key={batch.id}
                style={{
                  alignItems: "center",
                  backgroundColor: batch.id === selectedBatch?.id ? colors.blue50 : colors.surface,
                  border: `1px solid ${batch.id === selectedBatch?.id ? colors.primary : colors.border}`,
                  borderRadius: radius.sm,
                  display: "flex",
                  gap: spacing.sm,
                  justifyContent: "space-between",
                  padding: `${spacing.sm}px ${spacing.md}px`,
                }}
              >
                <button
                  onClick={() => handleSelectBatch(batch)}
                  style={{ background: "none", border: "none", cursor: "pointer", flex: 1, padding: 0, textAlign: "left" }}
                  type="button"
                >
                  <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{batch.reference}</div>
                  <div style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.xs }}>
                    {batch.fileName} • {batch.totalBeneficiaries} beneficiaries • uploaded {new Date(batch.uploadDate).toLocaleString()}
                  </div>
                </button>
                {canDeleteBatches ? (
                  confirmingDeleteId === batch.id ? (
                    <div style={{ alignItems: "center", display: "flex", gap: spacing.xs }}>
                      <span style={{ color: "#B91C1C", fontSize: typography.small }}>Delete this batch?</span>
                      <button
                        disabled={isDeleting}
                        onClick={() => setConfirmingDeleteId(null)}
                        style={{
                          backgroundColor: "transparent",
                          border: `1px solid ${colors.border}`,
                          borderRadius: 4,
                          cursor: isDeleting ? "not-allowed" : "pointer",
                          padding: "4px 10px",
                        }}
                        type="button"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isDeleting}
                        onClick={() => handleDeleteBatch(batch)}
                        style={{
                          backgroundColor: "#DC2626",
                          border: "none",
                          borderRadius: 4,
                          color: "#FFFFFF",
                          cursor: isDeleting ? "not-allowed" : "pointer",
                          opacity: isDeleting ? 0.7 : 1,
                          padding: "4px 10px",
                        }}
                        type="button"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingDeleteId(batch.id)}
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #FCA5A5",
                        borderRadius: 4,
                        color: "#B91C1C",
                        cursor: "pointer",
                        flexShrink: 0,
                        padding: "6px 12px",
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  )
                ) : null}
              </div>
            ))}
          </div>
        )}
        {unassignedError ? (
          <div style={{ color: "#B91C1C", fontSize: typography.small, marginTop: spacing.sm }}>{unassignedError}</div>
        ) : null}
        {deleteError ? (
          <div style={{ color: "#B91C1C", fontSize: typography.small, marginTop: spacing.sm }}>{deleteError}</div>
        ) : null}
      </div>
      {error ? (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#B91C1C", padding: 16 }}>
          {error}
        </div>
      ) : null}
      {selectedBatch ? (
        <BranchAssignmentPanel
          assignment={assignment}
          assignments={assignment ? [assignment] : []}
          assignedBeneficiaryIds={assignment ? assignment.assignedTransactions.map((beneficiary) => beneficiary.id) : []}
          beneficiaries={selectedBeneficiaries}
          isAssignmentConfirmed={isAssignmentFinalized}
          isReadOnly={isAssignmentFinalized}
          onConfirm={handleConfirmAssignment}
          sharedBatch={selectedBatch}
        />
      ) : null}
    </PageContainer>
  );
}
