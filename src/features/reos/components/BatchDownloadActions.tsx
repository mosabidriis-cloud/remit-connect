import { useState } from "react";
import type { SharedBatchLifecycleStatus } from "../types/sharedBatch";

type BatchDownloadActionsProps = {
  actorCanDownload: boolean;
  lifecycleStatus: SharedBatchLifecycleStatus;
  proofImageCount: number;
  isDownloadingZip: boolean;
  onDownloadZip: () => void;
  onConfirmDownloaded: () => void;
};

export function BatchDownloadActions({
  actorCanDownload,
  lifecycleStatus,
  proofImageCount,
  isDownloadingZip,
  onDownloadZip,
  onConfirmDownloaded,
}: BatchDownloadActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const canDownload = actorCanDownload && proofImageCount > 0 && lifecycleStatus === "READY_FOR_DOWNLOAD";

  return (
    <section className="rounded border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Proof Downloads</h2>
          <p className="text-sm text-slate-600">{proofImageCount} proof image(s) available.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canDownload || isDownloadingZip}
            onClick={onDownloadZip}
            type="button"
          >
            {isDownloadingZip ? "Preparing ZIP" : "Download ZIP"}
          </button>
          <button
            className="rounded border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!actorCanDownload || lifecycleStatus !== "READY_FOR_DOWNLOAD"}
            onClick={() => setIsConfirming(true)}
            type="button"
          >
            Confirm
          </button>
        </div>
      </div>
      {isConfirming ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">
            This action completes the REOS operational workflow for this batch.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              onClick={() => setIsConfirming(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                setIsConfirming(false);
                onConfirmDownloaded();
              }}
              type="button"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
