import type { ChangeEvent } from "react";
import { colors, radius, spacing, typography } from "../theme";

type ProofUploadProps = {
  onUpload: (files: File[]) => void;
};

export function ProofUpload({ onUpload }: ProofUploadProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 0) {
      onUpload(files);
      event.target.value = "";
    }
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
    </label>
  );
}
