import { colors, radius, spacing, typography } from "../theme";

type UploadProgressStage = "idle" | "uploading" | "validation" | "confirm" | "ready";

type UploadProgressProps = {
  progress: number;
  stage: UploadProgressStage;
};

const labels: Record<UploadProgressStage, string> = {
  idle: "Waiting for upload",
  uploading: "Uploading file",
  validation: "Reviewing validation results",
  confirm: "Awaiting confirmation",
  ready: "Batch ready for assignment",
};

export function UploadProgress({ progress, stage }: UploadProgressProps) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{labels[stage]}</div>
      <div style={{ backgroundColor: colors.slate100, borderRadius: radius.pill, height: 10, marginTop: spacing.sm, overflow: "hidden" }}>
        <div
          style={{
            backgroundColor: stage === "ready" ? colors.success : colors.primary,
            height: "100%",
            width: `${Math.max(progress, stage === "ready" ? 100 : 0)}%`,
            transition: "width 180ms ease-in-out",
          }}
        />
      </div>
      <div style={{ color: colors.muted, fontSize: typography.caption, marginTop: spacing.xs }}>{Math.round(progress)}%</div>
    </div>
  );
}
