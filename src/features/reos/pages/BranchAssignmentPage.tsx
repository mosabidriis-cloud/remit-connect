import { useEffect, useState } from "react";
import { BranchAssignedBatchView } from "../components/BranchAssignedBatchView";
import { BranchAssignmentForm, type BranchAssignmentFormValues } from "../components/BranchAssignmentForm";
import { BranchAssignmentStatus } from "../components/BranchAssignmentStatus";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import {
  assignSharedBatchToBranch,
  getSharedBatchesVisibleToBranchOfficer,
  reassignSharedBatch,
} from "../services/branchAssignmentService";
import { getBranchById } from "../services/branchRegistryService";
import { deleteSharedBatch, getAllSharedBatches, getBeneficiaries, saveAssignment, saveSharedBatch } from "../services/sharedBatchStore";
import { recordAuditEvent } from "../services/auditService";
import { useReosSession } from "../layout/reosAuthContext";
import { colors, radius, spacing, typography } from "../theme";
import type { Assignment } from "../types/assignment";
import type { SharedBatchReassignmentAudit } from "../types/branchAssignment";
import type { SharedBatch } from "../types/sharedBatch";

export function BranchAssignmentPage() {
  const { session } = useReosSession();
  const [sharedBatch, setSharedBatch] = useState<SharedBatch | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [audit, setAudit] = useState<SharedBatchReassignmentAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unassignedBatches, setUnassignedBatches] = useState<SharedBatch[]>([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Real, uploaded Shared Batches waiting for their initial assignment. Re-fetched after
  // every successful assign/reassign (refreshSignal) so the just-assigned batch drops
  // out of the list immediately, the same real-time behavior the in-memory store gave
  // for free before this page's data moved to Supabase.
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
          setError(cause instanceof Error ? cause.message : "Unable to load uploaded Shared Batches.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshSignal]);

  const visibleBatches = getSharedBatchesVisibleToBranchOfficer(sharedBatch ? [sharedBatch] : [], sharedBatch?.assignedBranchId ?? "");
  const canDeleteBatches = session?.role === "OPERATIONS_MANAGER" || session?.role === "DIRECT_REMIT_OFFICER";

  const handleSubmit = async (values: BranchAssignmentFormValues) => {
    setError(null);

    try {
      const batch = sharedBatch ?? unassignedBatches.find((candidate) => candidate.id === selectedBatchId) ?? null;

      if (!batch) {
        throw new Error("Select an uploaded Shared Batch before assigning.");
      }

      const branchName = getBranchById(values.branchId)?.name ?? values.branchId;

      if (batch.assignmentStatus === "ASSIGNED") {
        if (!assignment) {
          throw new Error("No existing Assignment was found to reassign.");
        }

        if (!session) {
          return;
        }

        const result = await reassignSharedBatch({
          sharedBatch: batch,
          newBranchId: values.branchId,
          newBranchName: branchName,
          reassignedByUserId: session.userId,
          actorRole: session.role,
          reason: values.reassignmentReason,
          assignment,
        });

        await saveAssignment(result.assignment);
        await saveSharedBatch(result.sharedBatch);
        setSharedBatch(result.sharedBatch);
        setAssignment(result.assignment);
        setAudit(result.audit);
        setRefreshSignal((value) => value + 1);
        return;
      }

      if (!session) {
        return;
      }

      const beneficiaries = await getBeneficiaries(batch.id);

      const result = await assignSharedBatchToBranch({
        sharedBatch: batch,
        beneficiaries: [...beneficiaries],
        branchId: values.branchId,
        branchName,
        assignedByUserId: session.userId,
        actorRole: session.role,
      });

      await saveAssignment(result.assignment);
      await saveSharedBatch(result.sharedBatch);
      setSharedBatch(result.sharedBatch);
      setAssignment(result.assignment);
      setAudit(result.audit);
      setSelectedBatchId(null);
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

      if (selectedBatchId === batch.id) {
        setSelectedBatchId(null);
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
                  backgroundColor: batch.id === selectedBatchId ? colors.blue50 : colors.surface,
                  border: `1px solid ${batch.id === selectedBatchId ? colors.primary : colors.border}`,
                  borderRadius: radius.sm,
                  display: "flex",
                  gap: spacing.sm,
                  justifyContent: "space-between",
                  padding: `${spacing.sm}px ${spacing.md}px`,
                }}
              >
                <button
                  onClick={() => setSelectedBatchId(batch.id)}
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
        {deleteError ? (
          <div style={{ color: "#B91C1C", fontSize: typography.small, marginTop: spacing.sm }}>{deleteError}</div>
        ) : null}
      </div>
      <BranchAssignmentForm onSubmit={handleSubmit} />
      <BranchAssignmentStatus audit={audit} error={error} sharedBatch={sharedBatch} />
      <BranchAssignedBatchView branchId={sharedBatch?.assignedBranchId ?? ""} sharedBatches={visibleBatches} />
    </PageContainer>
  );
}
