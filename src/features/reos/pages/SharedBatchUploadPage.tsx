import { useMemo, useState } from "react";
import { AssignmentSummary } from "../components/AssignmentSummary";
import { BatchSummary } from "../components/BatchSummary";
import { BranchAssignmentPanel } from "../components/BranchAssignmentPanel";
import { ConfirmUploadDialog } from "../components/ConfirmUploadDialog";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { UploadProgress } from "../components/UploadProgress";
import { UploadZone } from "../components/UploadZone";
import { ValidationErrors } from "../components/ValidationErrors";
import { ValidationSummary } from "../components/ValidationSummary";
import { assignSharedBatchToBranch } from "../services/branchAssignmentService";
import { validateExcelUpload } from "../services/excelValidationService";
import { saveAssignment, saveSharedBatch } from "../services/sharedBatchStore";
import { spacing } from "../theme";
import type { Assignment } from "../types/assignment";
import type { Beneficiary } from "../types/beneficiary";
import type { SharedBatch } from "../types/sharedBatch";

export function SharedBatchUploadPage() {
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

  const handleUpload = async (file: File) => {
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

    try {
      const result = await validateExcelUpload(file);
      setValidationSummary(result.summary);
      setValidationIssues(result.issues);
      setSharedBatch(result.sharedBatch);
      saveSharedBatch(result.sharedBatch);
      setAssignableBeneficiaries(result.beneficiaries);
      setProgress(100);
      setIsUploading(false);
      setIsValidationComplete(true);
    } catch (error) {
      setProgress(0);
      setIsUploading(false);
      setIsValidationComplete(false);
      setValidationError(error instanceof Error ? error.message : "The workbook could not be validated.");
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
              <BranchAssignmentPanel
                assignment={assignment}
                assignments={assignments}
                assignedBeneficiaryIds={assignedBeneficiaryIds}
                beneficiaries={assignableBeneficiaries}
                isAssignmentConfirmed={isAssignmentFinalized}
                isReadOnly={isAssignmentFinalized}
                onConfirm={(branchId) => {
                  const remainingReadyTransactions = assignableBeneficiaries.filter(
                    (beneficiary) => beneficiary.processingStatusId === "READY_FOR_ASSIGNMENT" && !assignedBeneficiaryIds.includes(beneficiary.id),
                  );

                  if (remainingReadyTransactions.length === 0) {
                    return;
                  }

                  const result = assignSharedBatchToBranch({
                    sharedBatch,
                    beneficiaries: remainingReadyTransactions,
                    branchId,
                    branchName: branchId === "PORT_SUDAN" ? "Port Sudan Branch" : branchId,
                    assignedByUserId: "current-user",
                    actorRole: "DIRECT_REMIT_OFFICER",
                  });

                  const nextAssignments = [...assignments, result.assignment];
                  const nextAssignedBeneficiaryIds = [
                    ...assignedBeneficiaryIds,
                    ...result.assignment.assignedTransactions.map((beneficiary) => beneficiary.id),
                  ];

                  saveAssignment(result.assignment);
                  saveSharedBatch(result.sharedBatch);

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
              {isAssignmentFinalized ? (
                <AssignmentSummary
                  assignments={assignments}
                  invalidCount={assignableBeneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "INVALID").length}
                  manualReviewCount={assignableBeneficiaries.filter((beneficiary) => beneficiary.processingStatusId === "MANUAL_REVIEW").length}
                  sharedBatch={sharedBatch}
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      <ConfirmUploadDialog
        canConfirm={canConfirm}
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setShowConfirmDialog(false);
          setValidationSummary((current) => current ? { ...current, batchStatus: "READY_FOR_ASSIGNMENT", processingMode: "Process Valid Transactions Only" } : current);
          setIsConfirmed(true);
        }}
        open={showConfirmDialog}
        summary={{ batchReference: validationSummary?.batchReference ?? "Uploaded Batch", fileName: selectedFileName ?? "direct-remit-batch.xlsx", readyForAssignment: validationSummary?.readyForAssignment ?? false }}
      />
    </PageContainer>
  );
}
