import { useEffect, useMemo, useState } from "react";
import { BatchSummary } from "../components/BatchSummary";
import { ConfirmUploadDialog } from "../components/ConfirmUploadDialog";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { UploadProgress } from "../components/UploadProgress";
import { UploadZone } from "../components/UploadZone";
import { ValidationErrors } from "../components/ValidationErrors";
import { ValidationSummary } from "../components/ValidationSummary";

const mockedSummary = {
  batchReference: "DRB-2026-0148",
  uploadDate: "2026-08-01 10:15",
  uploadedBy: "Direct Remit Officer",
  totalRecords: 248,
  validRecords: 232,
  manualReview: 7,
  duplicates: 3,
  invalidRecords: 6,
  status: "Ready for Review",
  readyForAssignment: true,
};

const mockedIssues = [
  { id: "1", field: "Beneficiary Name", message: "Missing value for one record in the draft file.", severity: "WARNING" as const },
  { id: "2", field: "Account Number", message: "Two entries appear to be malformed and need review.", severity: "ERROR" as const },
];

export function SharedBatchUploadPage() {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidationComplete, setIsValidationComplete] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isUploading) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          window.clearInterval(timer);
          setIsUploading(false);
          setIsValidationComplete(true);
          return 100;
        }

        return current + 20;
      });
    }, 220);

    return () => window.clearInterval(timer);
  }, [isUploading]);

  const handleUpload = (file: File) => {
    setSelectedFileName(file.name);
    setProgress(0);
    setIsValidationComplete(false);
    setIsUploading(true);
    setShowConfirmDialog(false);
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
      {isValidationComplete ? (
        <>
          <ValidationSummary summary={mockedSummary} />
          <ValidationErrors issues={mockedIssues} />
          <BatchSummary
            summary={{
              batchReference: mockedSummary.batchReference,
              fileName: selectedFileName ?? "direct-remit-batch.csv",
              totalRecords: mockedSummary.totalRecords,
              validRecords: mockedSummary.validRecords,
              status: mockedSummary.status,
              readyForAssignment: mockedSummary.readyForAssignment,
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowConfirmDialog(true)}
              style={{
                backgroundColor: mockedSummary.readyForAssignment ? "#2563EB" : "#F59E0B",
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
        summary={{ batchReference: mockedSummary.batchReference, fileName: selectedFileName ?? "direct-remit-batch.csv", readyForAssignment: mockedSummary.readyForAssignment }}
      />
    </PageContainer>
  );
}
