import { useState, type ChangeEvent } from "react";
import { colors, radius, spacing, typography } from "../theme";
import { MAX_PROOF_FILE_SIZE_BYTES } from "../services/proofOfPaymentService";

type ProofUploadProps = {
  onUpload: (files: File[]) => void;
};

const maxSizeLabel = `${Math.round(MAX_PROOF_FILE_SIZE_BYTES / (1024 * 1024))}MB`;

export function ProofUpload({ onUpload }: ProofUploadProps) {
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const oversized = files.filter((file) => file.size > MAX_PROOF_FILE_SIZE_BYTES);
    const accepted = files.filter((file) => file.size <= MAX_PROOF_FILE_SIZE_BYTES);

    setRejectionMessage(
      oversized.length > 0
        ? `${oversized.length} file${oversized.length === 1 ? "" : "s"} over ${maxSizeLabel} ${oversized.length === 1 ? "was" : "were"} not added: ${oversized.map((file) => file.name).join(", ")}`
        : null,
    );

    if (accepted.length > 0) {
      onUpload(accepted);
    }

    event.target.value = "";
  };

  return (
    <label
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        color: colors.text,
        display: "grid",
        fontSize: typography.small,
        fontWeight: 500,
        gap: spacing.sm,
        padding: spacing.lg,
      }}
    >
      Upload Proof
      <input
        accept="image/*"
        multiple
        onChange={handleChange}
        style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: typography.small, padding: `${spacing.sm}px ${spacing.md}px` }}
        type="file"
      />
      <span style={{ color: colors.muted, fontSize: typography.caption }}>Images up to {maxSizeLabel} each.</span>
      {rejectionMessage ? <span style={{ color: colors.danger, fontSize: typography.caption }}>{rejectionMessage}</span> : null}
    </label>
  );
}
