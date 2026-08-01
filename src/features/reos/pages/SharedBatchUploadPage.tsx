import { useMemo, useState } from "react";
import { BatchSummary } from "../components/BatchSummary";
import { ConfirmUploadDialog } from "../components/ConfirmUploadDialog";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { UploadProgress } from "../components/UploadProgress";
import { UploadZone } from "../components/UploadZone";
import { ValidationErrors } from "../components/ValidationErrors";
import { ValidationSummary } from "../components/ValidationSummary";
import { validateExcelUpload } from "../services/excelValidationService";
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
  } | null>(null);
  const [validationIssues, setValidationIssues] = useState<Array<{ id: string; field: string; message: string; severity: "ERROR" | "WARNING" }>>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setSelectedFileName(file.name);
    setProgress(0);
    setValidationError(null);
    setValidationIssues([]);
    setValidationSummary(null);
    setSharedBatch(null);
    setIsValidationComplete(false);
    setIsUploading(true);
    setShowConfirmDialog(false);

    try {
      const result = await validateExcelUpload(file);
      setValidationSummary(result.summary);
      setValidationIssues(result.issues);
      setSharedBatch(result.sharedBatch);
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
      {validationSummary && sharedBatch ? (
        <>
          <ValidationSummary summary={validationSummary} />
          <ValidationErrors issues={validationIssues} />
          <BatchSummary
            summary={{
              batchReference: sharedBatch.reference,
              fileName: sharedBatch.fileName,
              totalRecords: sharedBatch.totalBeneficiaries,
              validRecords: validationSummary.validRecords,
              status: validationSummary.status,
              readyForAssignment: validationSummary.readyForAssignment,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowConfirmDialog(true)}
              style={{
                backgroundColor: validationSummary.readyForAssignment ? "#2563EB" : "#F59E0B",
                border: "none",
                borderRadius: 4,
                color: "#FFFFFF",
                cursor: "pointer",
                padding: "10px 16px",
              }}
              type="button"
            >
              Confirm Upload
            </button>
          </div>
        </>
      ) : null}
      <ConfirmUploadDialog
        onCancel={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setShowConfirmDialog(false);
          setIsValidationComplete(true);
        }}
        open={showConfirmDialog}
        summary={{ batchReference: validationSummary?.batchReference ?? "Uploaded Batch", fileName: selectedFileName ?? "direct-remit-batch.xlsx", readyForAssignment: validationSummary?.readyForAssignment ?? false }}
      />
    </PageContainer>
  );
}
