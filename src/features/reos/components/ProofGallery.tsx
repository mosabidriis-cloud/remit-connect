import { colors, radius, spacing, typography } from "../theme";
import type { ProofOfPayment } from "../types/proofOfPayment";

type ProofGalleryProps = {
  proofs: ProofOfPayment[];
};

export function ProofGallery({ proofs }: ProofGalleryProps) {
  if (proofs.length === 0) {
    return (
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.muted,
          fontSize: typography.small,
          padding: spacing.lg,
        }}
      >
        No proof-of-payment screenshots uploaded.
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        display: "grid",
        gap: spacing.md,
        padding: spacing.lg,
      }}
    >
      <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Proof Gallery</h2>
      <div style={{ display: "grid", gap: spacing.md, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        {proofs.map((proof) => (
          <figure key={proof.id} style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.sm }}>
            <img
              alt={proof.fileName}
              src={proof.previewUrl}
              style={{ aspectRatio: "16 / 9", borderRadius: radius.sm, objectFit: "cover", width: "100%" }}
            />
            <figcaption style={{ color: colors.muted, fontSize: typography.caption, marginTop: spacing.sm }}>
              <span style={{ color: colors.text, display: "block", fontWeight: 600 }}>{proof.fileName}</span>
              <span>Expires {proof.expiresAt}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
