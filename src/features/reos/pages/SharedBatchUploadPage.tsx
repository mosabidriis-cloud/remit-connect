import { useState } from "react";
import { BeneficiaryImportTable } from "../components/BeneficiaryImportTable";
import { SharedBatchReadinessNotice } from "../components/SharedBatchReadinessNotice";
import { SharedBatchSummary } from "../components/SharedBatchSummary";
import { SharedBatchUploadForm } from "../components/SharedBatchUploadForm";
import { SharedBatchValidationSummary } from "../components/SharedBatchValidationSummary";
import { importSharedBatch } from "../services/sharedBatchService";
import type { SharedBatchImportResult } from "../types/sharedBatchImport";

export function SharedBatchUploadPage() {
  const [importResult, setImportResult] = useState<SharedBatchImportResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleUpload = (file: File) => {
    setFileError(null);

    void file
      .text()
      .then((fileContent) => {
        setImportResult(
          importSharedBatch({
            fileName: file.name,
            fileContent,
            uploadedByUserId: "DIRECT_REMIT_OFFICER",
          }),
        );
      })
      .catch(() => {
        setFileError("Unable to read the selected Direct Remit batch file.");
      });
  };

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-950">Shared Batch Upload</h1>
        <p className="mt-1 text-sm text-slate-600">Upload and validate a Direct Remit batch for branch assignment readiness.</p>
      </header>
      <SharedBatchUploadForm onUpload={handleUpload} />
      {fileError ? (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{fileError}</div>
      ) : null}
      {importResult ? (
        <>
          <SharedBatchSummary sharedBatch={importResult.sharedBatch} />
          <SharedBatchReadinessNotice
            canCreateSharedBatch={importResult.canCreateSharedBatch}
            manualReviewCount={importResult.sharedBatch.manualReviewCount}
          />
          <SharedBatchValidationSummary issues={importResult.validationIssues} />
          <BeneficiaryImportTable beneficiaries={importResult.beneficiaries} />
        </>
      ) : null}
    </section>
  );
}
