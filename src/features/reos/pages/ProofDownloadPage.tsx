import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { BatchDownloadActions } from "../components/BatchDownloadActions";
import { BatchDownloadSummary } from "../components/BatchDownloadSummary";
import { EmptyState } from "../components/common/EmptyState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { DownloadHistory } from "../components/DownloadHistory";
import { ProofDownloadPanel } from "../components/ProofDownloadPanel";
import {
  downloadIndividualProof,
  downloadProofZip,
  getBatchDownloadSummary,
  getDownloadableProofs,
  markBatchDownloaded,
} from "../services/proofDownloadService";
import type {
  DownloadableProof,
  ProofDownloadActorRole,
  ProofDownloadBatch,
  ProofDownloadHistoryEntry,
} from "../types/proofDownload";

type ProofDownloadLocationState = {
  batch?: ProofDownloadBatch;
  actorUserId?: string;
  actorRole?: ProofDownloadActorRole;
};

export function ProofDownloadPage() {
  const location = useLocation();
  const state = location.state as ProofDownloadLocationState | null;
  const [batch, setBatch] = useState<ProofDownloadBatch | null>(state?.batch ?? null);
  const [history, setHistory] = useState<ProofDownloadHistoryEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const actorUserId = state?.actorUserId ?? "DIRECT_REMIT_OFFICER";
  const actorRole = state?.actorRole ?? "DIRECT_REMIT_OFFICER";
  const actorCanDownload = actorRole === "DIRECT_REMIT_OFFICER";
  const summary = useMemo(() => (batch ? getBatchDownloadSummary(batch) : null), [batch]);
  const downloadableProofs = useMemo(() => (batch ? getDownloadableProofs(batch) : []), [batch]);

  const handleDownloadZip = async () => {
    if (!batch) {
      return;
    }

    setIsDownloadingZip(true);
    setMessage(null);

    try {
      const entry = await downloadProofZip({ batch, actorUserId, actorRole });
      setHistory((currentHistory) => [entry, ...currentHistory]);
      setMessage("ZIP download prepared.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to download proof ZIP.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleDownloadProof = async (downloadableProof: DownloadableProof) => {
    if (!batch) {
      return;
    }

    setMessage(null);

    try {
      const entry = await downloadIndividualProof({ batch, actorUserId, actorRole }, downloadableProof.proof);
      setHistory((currentHistory) => [entry, ...currentHistory]);
      setMessage("Individual proof download prepared.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to download proof image.");
    }
  };

  const handleConfirmDownloaded = () => {
    if (!batch) {
      return;
    }

    setMessage(null);

    try {
      const result = markBatchDownloaded({
        batch,
        actorUserId,
        actorRole,
      });

      setBatch(result.batch);
      setHistory((currentHistory) => [result.history, ...currentHistory]);
      setMessage("Shared Batch marked as DOWNLOADED.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to mark Shared Batch as downloaded.");
    }
  };

  if (!batch || !summary) {
    return (
      <PageContainer>
        <PageHeader
          description="Open a completed Shared Batch to view its download summary."
          title="Proof Download"
        />
        <EmptyState message="No completed batch is selected for proof download." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        description="Download proof-of-payment files for completed Shared Batches."
        title="Proof Download"
      />
      {!actorCanDownload ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Operations Manager access is read-only for proof download monitoring.
        </div>
      ) : null}
      {message ? <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</div> : null}
      <BatchDownloadSummary summary={summary} />
      <BatchDownloadActions
        actorCanDownload={actorCanDownload}
        lifecycleStatus={batch.lifecycleStatus}
        proofImageCount={summary.proofImageCount}
        isDownloadingZip={isDownloadingZip}
        onDownloadZip={handleDownloadZip}
        onConfirmDownloaded={handleConfirmDownloaded}
      />
      <ProofDownloadPanel
        actorCanDownload={actorCanDownload && batch.lifecycleStatus === "READY_FOR_DOWNLOAD"}
        proofs={downloadableProofs}
        onDownloadProof={handleDownloadProof}
      />
      <DownloadHistory history={history} />
    </PageContainer>
  );
}
