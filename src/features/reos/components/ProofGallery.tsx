import type { ProofOfPayment } from "../types/proofOfPayment";

type ProofGalleryProps = {
  proofs: ProofOfPayment[];
};

export function ProofGallery({ proofs }: ProofGalleryProps) {
  if (proofs.length === 0) {
    return (
      <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No proof-of-payment screenshots uploaded.
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">Proof Gallery</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {proofs.map((proof) => (
          <figure className="rounded border border-slate-200 p-2" key={proof.id}>
            <img alt={proof.fileName} className="aspect-video w-full rounded object-cover" src={proof.previewUrl} />
            <figcaption className="mt-2 text-xs text-slate-600">
              <span className="block font-medium text-slate-800">{proof.fileName}</span>
              <span>Expires {proof.expiresAt}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
