import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { BatchDownloadActions } from "../components/BatchDownloadActions";
import { BatchDownloadSummary } from "../components/BatchDownloadSummary";
import { EmptyState } from "../components/common/EmptyState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { DownloadHistory } from "../components/DownloadHistory";
import { ProofDownloadPanel } from "../components/ProofDownloadPanel";
import { useReosSession } from "../layout/reosAuthContext";
import {
  buildProofDownloadBatchFromSharedBatch,
  downloadIndividualProof,
  downloadProofZip,
  getBatchDownloadSummary,
  getDownloadableProofs,
  markBatchDownloaded,
  markSharedBatchReadyForDownload,
} from "../services/proofDownloadService";
import { getSharedBatch, updateSharedBatchLifecycleStatus } from "../services/sharedBatchStore";
import type {
  DownloadableProof,
  ProofDownloadBatch,
  ProofDownloadHistoryEntry,
} from "../types/proofDownload";

export function ProofDownloadPage() {
  const { batchId } = useParams();
  const { session } = useReosSession();
  const [batch, setBatch] = useState<ProofDownloadBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ProofDownloadHistoryEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  // Route is RoleGate'd to DIRECT_REMIT_OFFICER/OPERATIONS_MANAGER (AUTHENTICATION.md
  // Section 6) - BRANCH_OFFICER cannot reach this page, so the narrower
  // ProofDownloadActorRole is always satisfied here.
  const actorUserId = session?.userId ?? "";
  const actorRole = session?.role === "OPERATIONS_MANAGER" ? "OPERATIONS_MANAGER" : "DIRECT_REMIT_OFFICER";
  const actorCanDownload = actorRole === "DIRECT_REMIT_OFFICER";
  const summary = useMemo(() => (batch ? getBatchDownloadSummary(batch) : null), [batch]);
  const downloadableProofs = useMemo(() => (batch ? getDownloadableProofs(batch) : []), [batch]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Deferred past the current synchronous effect tick so setLoading(true) below never
      // runs synchronously within the effect body itself.
      await Promise.resolve();

      if (!cancelled) {
        setLoading(true);
      }

      const sharedBatch = batchId ? await getSharedBatch(batchId) : null;
      const proofDownloadBatch = sharedBatch ? await buildProofDownloadBatchFromSharedBatch(sharedBatch) : null;

      if (!cancelled) {
        setBatch(proofDownloadBatch);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  // Opening Proof Management for a COMPLETED batch performs the approved
  // COMPLETED -> READY_FOR_DOWNLOAD transition (LIFECYCLE.md). Only the Direct Remit
  // Officer may trigger it, so a read-only Operations Manager viewing the page does
  // not advance the lifecycle. Re-runs are inert: after the transition the batch is
  // no longer COMPLETED.
  useEffect(() => {
    if (!batch || batch.lifecycleStatus !== "COMPLETED" || !actorCanDownload) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const readyBatch = markSharedBatchReadyForDownload({ batch, actorUserId, actorRole });
        await updateSharedBatchLifecycleStatus(readyBatch.id, "READY_FOR_DOWNLOAD");

        if (!cancelled) {
          setBatch(readyBatch);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setMessage(caughtError instanceof Error ? caughtError.message : "Unable to open the proof download workflow.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [batch, actorCanDownload, actorUserId, actorRole]);

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

  const handleConfirmDownloaded = async () => {
    if (!batch) {
      return;
    }

    setMessage(null);

    try {
      const result = await markBatchDownloaded({
        batch,
        actorUserId,
        actorRole,
      });

      await updateSharedBatchLifecycleStatus(result.batch.id, "DOWNLOADED");
      setBatch(result.batch);
      setHistory((currentHistory) => [result.history, ...currentHistory]);
      setMessage("Shared Batch marked as DOWNLOADED.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to mark Shared Batch as downloaded.");
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          description="Open an assigned Shared Batch to view completed transactions and download proofs as they finish."
          title="Proof Download"
        />
        <EmptyState message="Loading..." />
      </PageContainer>
    );
  }

  if (!batch || !summary) {
    return (
      <PageContainer>
        <PageHeader
          description="Open an assigned Shared Batch to view completed transactions and download proofs as they finish."
          title="Proof Download"
        />
        <EmptyState message="No assigned batch is selected for proof download." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        description="Download proof-of-payment files as transactions complete - no need to wait for the whole batch."
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
      {/* Individual proofs are available as soon as their own transaction completes -
          downloadableProofs is already filtered to COMPLETED transactions only
          (proofDownloadService.getDownloadableProofs), independent of whether the rest
          of the batch, or the batch's own lifecycleStatus, has finished yet. */}
      <ProofDownloadPanel
        actorCanDownload={actorCanDownload}
        proofs={downloadableProofs}
        onDownloadProof={handleDownloadProof}
      />
      <DownloadHistory history={history} />
    </PageContainer>
  );
}
