import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { colors, radius, spacing, typography } from "../theme";

type UploadZoneProps = {
  isUploading: boolean;
  onFileSelected: (file: File) => void;
  selectedFileName?: string | null;
};

export function UploadZone({ isUploading, onFileSelected, selectedFileName }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelection = (file?: File) => {
    if (file) {
      onFileSelected(file);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files?.[0]);
  };

  return (
    <div
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={handleDrop}
      style={{
        backgroundColor: isDragging ? colors.blue50 : colors.surface,
        border: `2px dashed ${isDragging ? colors.primary : colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.xxl,
        textAlign: "center",
      }}
    >
      <input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={handleInputChange} ref={inputRef} type="file" />
      <div style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Upload Direct Remit Batch</div>
      <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
        Drag and drop an .xlsx workbook or select it from your device to begin the Excel validation workflow.
      </p>
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          backgroundColor: colors.primary,
          border: "none",
          borderRadius: radius.sm,
          color: colors.surface,
          cursor: "pointer",
          fontSize: typography.small,
          fontWeight: 600,
          marginTop: spacing.lg,
          padding: `${spacing.sm}px ${spacing.lg}px`,
        }}
        type="button"
      >
        {isUploading ? "Uploading..." : "Select Batch File"}
      </button>
      {selectedFileName ? (
        <p style={{ color: colors.text, fontSize: typography.small, marginTop: spacing.md }}>
          Selected file: {selectedFileName}
        </p>
      ) : null}
    </div>
  );
}
