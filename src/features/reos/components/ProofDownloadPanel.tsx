import type { DownloadableProof } from "../types/proofDownload";

type ProofDownloadPanelProps = {
  actorCanDownload: boolean;
  proofs: DownloadableProof[];
  onDownloadProof: (proof: DownloadableProof) => void;
};

export function ProofDownloadPanel({ actorCanDownload, proofs, onDownloadProof }: ProofDownloadPanelProps) {
  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-950">Individual Proof Images</h2>
      </div>
      {proofs.length === 0 ? (
        <p className="p-4 text-sm text-slate-600">No proof images are available for download.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Direct Remit Reference</th>
                <th className="px-4 py-3">Proof Image</th>
                <th className="px-4 py-3">Uploaded Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proofs.map((proofItem) => (
                <tr key={proofItem.proof.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{proofItem.directRemitReference}</td>
                  <td className="px-4 py-3 text-slate-700">{proofItem.proof.fileName}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDateTime(proofItem.proof.uploadedAt)}</td>
                  <td className="px-4 py-3 text-slate-700">{proofItem.proof.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-sm font-medium text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                      disabled={!actorCanDownload}
                      onClick={() => onDownloadProof(proofItem)}
                      type="button"
                    >
                      Download Individual Proof
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
