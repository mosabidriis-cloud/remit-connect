import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AssignmentSummary } from "../components/AssignmentSummary";
import { BatchSummary } from "../components/BatchSummary";
import { BranchAssignmentPanel } from "../components/BranchAssignmentPanel";
import {
  BranchProcessingNavigation,
  type BranchProcessingNavigationTarget,
} from "../components/BranchProcessingNavigation";
import { ConfirmUploadDialog } from "../components/ConfirmUploadDialog";
import { DuplicateImportDialog } from "../components/DuplicateImportDialog";
import { ImportRecordSummary } from "../components/ImportRecordSummary";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { UploadProgress } from "../components/UploadProgress";
import { UploadZone } from "../components/UploadZone";
import { ValidationErrors } from "../components/ValidationErrors";
import { ValidationSummary } from "../components/ValidationSummary";
import { recordAuditEvent } from "../services/auditService";
import { assignSharedBatchToBranch } from "../services/branchAssignmentService";
import { validateExcelUpload } from "../services/excelValidationService";
import {
  checkForDuplicateImport,
  computeFileChecksum,
  deriveReportingPeriod,
  persistImport,
} from "../services/importIntelligenceService";
import { useReosSession } from "../layout/reosAuthContext";
import { getImportHistoryEntries } from "../services/operationalDatasetService";
import { saveAssignment, saveBeneficiaries, saveSharedBatch } from "../services/sharedBatchStore";
import { colors, radius, spacing, typography } from "../theme";
import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type { ImportBatchRecord } from "../types/importIntelligence";
import type { CoverageImpact } from "../types/operationalDataset";
import type { SharedBatch } from "../types/sharedBatch";

export function SharedBatchUploadPage() {
  const { session } = useReosSession();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidationComplete, setIsValidationComplete] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sharedBatch, setSharedBatch] = useState<SharedBatch | null>(null);
  const [validationSummary, setValidationSummary] = useState<{
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
  } | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isAssignmentConfirmed, setIsAssignmentConfirmed] = useState(false);
  const [isAssignmentFinalized, setIsAssignmentFinalized] = useState(false);
  const [assignableBeneficiaries, setAssignableBeneficiaries] = useState<Beneficiary[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignedBeneficiaryIds, setAssignedBeneficiaryIds] = useState<string[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [validationIssues, setValidationIssues] = useState<Array<{ id: string; field: string; message: string; severity: "ERROR" | "WARNING" }>>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Import Intelligence (DEC-016, IMPORT_INTELLIGENCE.md) - durable ledger, not the live
  // operational workflow above. Failing to check/persist never blocks assignment.
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileChecksum, setFileChecksum] = useState<string | null>(null);
  const [duplicateMatches, setDuplicateMatches] = useState<ImportBatchRecord[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [importRecord, setImportRecord] = useState<ImportBatchRecord | null>(null);
  const [importCoverageImpact, setImportCoverageImpact] = useState<CoverageImpact | null>(null);
  const [importIntelligenceError, setImportIntelligenceError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!session) {
      return;
    }

    setSelectedFileName(file.name);
    setProgress(0);
    setValidationError(null);
    setValidationIssues([]);
    setValidationSummary(null);
    setSharedBatch(null);
    setIsConfirmed(false);
    setIsAssignmentConfirmed(false);
    setAssignableBeneficiaries([]);
    setAssignments([]);
    setAssignedBeneficiaryIds([]);
    setAssignment(null);
    setIsAssignmentFinalized(false);
    setIsValidationComplete(false);
    setIsUploading(true);
    setShowConfirmDialog(false);
    setUploadedFile(file);
    setFileChecksum(null);
    setDuplicateMatches([]);
    setShowDuplicateDialog(false);
    setImportRecord(null);
    setImportCoverageImpact(null);
    setImportIntelligenceError(null);

    try {
      const result = await validateExcelUpload(file, session.userId);
      setValidationSummary(result.summary);
      setValidationIssues(result.issues);
      setSharedBatch(result.sharedBatch);
      await saveSharedBatch(result.sharedBatch);
      await saveBeneficiaries(result.sharedBatch.id, result.beneficiaries);
      await recordAuditEvent({
        actorUserId: session.userId,
        action: "BATCH_UPLOADED",
        entityType: "SHARED_BATCH",
        entityId: result.sharedBatch.id,
        details: `Uploaded Shared Batch ${result.sharedBatch.reference} (${file.name}, ${result.beneficiaries.length} beneficiaries).`,
      });
      setAssignableBeneficiaries(result.beneficiaries);
      setProgress(100);
      setIsUploading(false);
      setIsValidationComplete(true);

      // Fingerprint now, off the interactive path - ready by the time the operator
      // reaches Confirm Upload, without making the upload itself feel slower.
      computeFileChecksum(file)
        .then(setFileChecksum)
        .catch(() => setImportIntelligenceError("Unable to fingerprint this file for duplicate detection."));
    } catch (error) {
      setProgress(0);
      setIsUploading(false);
      setIsValidationComplete(false);
      setValidationError(error instanceof Error ? error.message : "The workbook could not be validated.");
    }
  };

  /**
   * Confirms the upload in the live workflow (unchanged) and, independently, records it
   * in the durable Import Intelligence ledger. A ledger failure is surfaced as a
   * non-blocking warning - it never prevents the operator from proceeding to Assignment,
   * matching importIntelligenceService's own contract.
   */
  const finalizeConfirm = async (resolution?: { type: "REPLACE" | "MERGE"; existingBatchId: string }) => {
    setValidationSummary((current) => (current ? { ...current, batchStatus: "READY_FOR_ASSIGNMENT", processingMode: "Process Valid Transactions Only" } : current));
    setIsConfirmed(true);
    setShowDuplicateDialog(false);

    // BATCH_CONFIRMED depends only on session/sharedBatch, checked here on their own -
    // this action is the confirmed-in-the-live-workflow fact, independent of whether
    // computeFileChecksum's background promise (kicked off at upload, "off the
    // interactive path") has resolved yet. Gating it behind that unrelated timing would
    // silently drop the audit record exactly the way it already silently drops the
    // Import Intelligence ledger entry below when confirmed before the checksum lands.
    if (sharedBatch && session) {
      await recordAuditEvent({
        actorUserId: session.userId,
        action: "BATCH_CONFIRMED",
        entityType: "SHARED_BATCH",
        entityId: sharedBatch.id,
        details: `Confirmed Shared Batch ${sharedBatch.reference}.`,
      });
    }

    if (!uploadedFile || !fileChecksum || !sharedBatch || !validationSummary || !session) {
      return;
    }

    try {
      const record = await persistImport({
        sharedBatch,
        beneficiaries: assignableBeneficiaries,
        file: uploadedFile,
        fileChecksum,
        actorUserId: session.userId,
        resolution,
        validationOutcome: {
          validRecordCount: validationSummary.validRecords,
          invalidRecordCount: validationSummary.invalidRecords,
          manualReviewRecordCount: validationSummary.manualReview,
        },
      });
      setImportRecord(record);

      // Best-effort - the Import Experience's "coverage impact" line. Never blocks or
      // overrides the record above if it fails; it's read-only context on top of it.
      getImportHistoryEntries()
        .then((entries) => {
          const matching = entries.find((entry) => entry.id === record.id);
          if (matching) {
            setImportCoverageImpact(matching.coverageImpact);
          }
        })
        .catch(() => undefined);
    } catch (error) {
      setImportIntelligenceError(error instanceof Error ? error.message : "Unable to record this import in the Import Intelligence ledger.");
    }
  };

  const handleConfirmUpload = async () => {
    setShowConfirmDialog(false);

    if (!uploadedFile || !fileChecksum || !sharedBatch) {
      await finalizeConfirm();
      return;
    }

    try {
      const reportingPeriod = deriveReportingPeriod(assignableBeneficiaries);
      const duplicateResult = await checkForDuplicateImport(fileChecksum, sharedBatch.reference, reportingPeriod);

      if (duplicateResult.isDuplicate) {
        setDuplicateMatches(duplicateResult.matches);
        setShowDuplicateDialog(true);
        return;
      }

      await finalizeConfirm();
    } catch (error) {
      setImportIntelligenceError(error instanceof Error ? error.message : "Unable to check for duplicate imports.");
      await finalizeConfirm();
    }
  };

  const stage = useMemo(() => {
    if (isUploading) {
      return "uploading" as const;
    }

    if (isValidationComplete) {
      return "ready" as const;
    }

    return "idle" as const;
  }, [isUploading, isValidationComplete]);

  const confirmedSummary = validationSummary
    ? {
        ...validationSummary,
        batchStatus: isAssignmentConfirmed ? "ASSIGNED" : isConfirmed ? "READY_FOR_ASSIGNMENT" : validationSummary.batchStatus,
        processingMode: "Process Valid Transactions Only",
      }
    : null;

  const canConfirm = Boolean(validationSummary && validationSummary.validRecords > 0);

  // Assignment gives us a real branch id/name directly - no store lookup needed.
  // Dedupes in case the same branch received more than one assignment group.
  const branchProcessingTargets = useMemo<BranchProcessingNavigationTarget[]>(() => {
    const targetsByBranch = new Map<string, string>();

    assignments.forEach((entry) => {
      if (entry.assignedBranchId) {
        targetsByBranch.set(entry.assignedBranchId, entry.assignedBranchName ?? entry.assignedBranchId);
      }
    });

    return Array.from(targetsByBranch.entries()).map(([branchId, branchName]) => ({ branchId, branchName }));
  }, [assignments]);

  return (
    <PageContainer>
      <PageHeader
        description="Upload and validate a Direct Remit batch for branch assignment readiness."
        title="Shared Batch Upload"
      />
      <UploadZone isUploading={isUploading} onFileSelected={handleUpload} selectedFileName={selectedFileName} />
      <UploadProgress progress={progress} stage={stage} />
      {validationError ? (
        <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, color: "#B91C1C", padding: 16 }}>
          {validationError}
        </div>
      ) : null}
      {confirmedSummary && sharedBatch ? (
        <>
          <ValidationSummary summary={confirmedSummary} />
          <ValidationErrors issues={validationIssues} />
          <BatchSummary
            summary={{
              batchReference: sharedBatch.reference,
              fileName: sharedBatch.fileName,
              totalRecords: sharedBatch.totalBeneficiaries,
              validRecords: confirmedSummary.validRecords,
              status: confirmedSummary.status,
              readyForAssignment: confirmedSummary.readyForAssignment,
              uploadDate: confirmedSummary.uploadDate,
              uploadedBy: confirmedSummary.uploadedBy,
              manualReview: confirmedSummary.manualReview,
              invalidRecords: confirmedSummary.invalidRecords,
              processingMode: confirmedSummary.processingMode,
              batchStatus: confirmedSummary.batchStatus,
              isLocked: sharedBatch.isLocked,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              disabled={!canConfirm || isConfirmed}
              onClick={() => setShowConfirmDialog(true)}
              style={{
                backgroundColor: canConfirm && !isConfirmed ? "#2563EB" : "#9CA3AF",
                border: "none",
                borderRadius: 4,
                color: "#FFFFFF",
                cursor: canConfirm && !isConfirmed ? "pointer" : "not-allowed",
                opacity: isConfirmed ? 0.8 : 1,
                padding: "10px 16px",
              }}
              type="button"
            >
              {isConfirmed ? "Upload Confirmed" : "Confirm Upload"}
            </button>
          </div>
          {isConfirmed ? (
            <div style={{ backgroundColor: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, color: "#065F46", padding: 16 }}>
              Ready transactions are now available for the future Branch Assignment module. Manual review and invalid transactions remain in this batch and are excluded from the assignment queue.
            </div>
          ) : null}
          {isConfirmed && sharedBatch ? (
            <div style={{ marginTop: spacing.lg }}>
              {session?.role === "OPERATIONS_MANAGER" || session?.role === "DIRECT_REMIT_OFFICER" ? (
                <BranchAssignmentPanel
                  assignment={assignment}
                  assignments={assignments}
                  assignedBeneficiaryIds={assignedBeneficiaryIds}
                  beneficiaries={assignableBeneficiaries}
                  isAssignmentConfirmed={isAssignmentFinalized}
                  isReadOnly={isAssignmentFinalized}
                  onConfirm={async (branchId) => {
                    const remainingReadyTransactions = assignableBeneficiaries.filter(
                      (beneficiary) => beneficiary.processingStatusId === "READY_FOR_ASSIGNMENT" && !assignedBeneficiaryIds.includes(beneficiary.id),
                    );

                    if (remainingReadyTransactions.length === 0) {
                      return;
                    }

                    const result = await assignSharedBatchToBranch({
                      sharedBatch,
                      beneficiaries: remainingReadyTransactions,
                      branchId,
                      branchName: branchId === "PORT_SUDAN" ? "Port Sudan Branch" : branchId,
                      assignedByUserId: session.userId,
                      actorRole: session.role,
                    });

                    const nextAssignments = [...assignments, result.assignment];
                    const nextAssignedBeneficiaryIds = [
                      ...assignedBeneficiaryIds,
                      ...result.assignment.assignedTransactions.map((beneficiary) => beneficiary.id),
                    ];

                    await saveAssignment(result.assignment);
                    await saveSharedBatch(result.sharedBatch);

                    setAssignment(result.assignment);
                    setAssignments(nextAssignments);
                    setAssignedBeneficiaryIds(nextAssignedBeneficiaryIds);
                    setIsAssignmentFinalized(true);
                    setSharedBatch(result.sharedBatch);
                    setValidationSummary((current) => current ? { ...current, batchStatus: "ASSIGNED" } : current);
                    setIsAssignmentConfirmed(true);
                  }}
                  sharedBatch={sharedBatch}
                />
              ) : (
                // DEC-025: initial assignment is Direct Remit Officer or Operations Manager -
                // every role that reaches this page (shared-batches/upload is DRO_OR_OM-gated)
                // takes the branch above. Kept as a defensive fallback, not a reachable path.
                <div style={{ backgroundColor: colors.blue50, border: "1px solid #BFDBFE", borderRadius: radius.sm, color: colors.blue700, fontSize: typography.small, padding: spacing.md }}>
                  This batch is ready for assignment. It can be assigned to a branch via{" "}
                  <Link style={{ color: colors.blue700, fontWeight: 600 }} to="/reos/shared-batches/assignment">
                    Branch Assignment
                  </Link>
                  .
                </div>
              )}
              {isAssignmentFinalized ? (
                <AssignmentSummary
                  assignments={assignments}
                  invalidCount={assignableBeneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "INVALID").length}
                  manualReviewCount={assignableBeneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "MANUAL_REVIEW").length}
                  sharedBatch={sharedBatch}
                />
              ) : null}
              {isAssignmentFinalized ? (
                <div style={{ marginTop: spacing.lg }}>
                  <BranchProcessingNavigation targets={branchProcessingTargets} />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {importRecord ? (
        <div style={{ display: "grid", gap: spacing.sm }}>
          <div style={{ backgroundColor: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, color: "#1D4ED8", padding: 16 }}>
            Recorded in Import Intelligence. This import will still be here after a reload -{" "}
            <Link style={{ color: "#1D4ED8", fontWeight: 600 }} to="/reos/import-intelligence">
              view Import Intelligence
            </Link>
            .
          </div>
          <ImportRecordSummary batch={importRecord} coverageImpact={importCoverageImpact ?? undefined} />
        </div>
      ) : null}
      {importIntelligenceError ? (
        <div style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, color: "#92400E", padding: 16 }}>
          Import Intelligence: {importIntelligenceError} The live Assignment workflow is unaffected.
        </div>
      ) : null}
      <ConfirmUploadDialog
        canConfirm={canConfirm}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmUpload}
        open={showConfirmDialog}
        summary={{ batchReference: validationSummary?.batchReference ?? "Uploaded Batch", fileName: selectedFileName ?? "direct-remit-batch.xlsx", readyForAssignment: validationSummary?.readyForAssignment ?? false }}
      />
      <DuplicateImportDialog
        matches={duplicateMatches}
        onCancel={() => setShowDuplicateDialog(false)}
        onMerge={() => {
          const existingBatchId = duplicateMatches[0]?.id;
          void finalizeConfirm(existingBatchId ? { type: "MERGE", existingBatchId } : undefined);
        }}
        onReplace={() => {
          const existingBatchId = duplicateMatches[0]?.id;
          void finalizeConfirm(existingBatchId ? { type: "REPLACE", existingBatchId } : undefined);
        }}
        open={showDuplicateDialog}
      />
    </PageContainer>
  );
}
