import { colors, radius, spacing, typography } from "../theme";
import type { ProofDownloadHistoryEntry } from "../types/proofDownload";

type DownloadHistoryProps = {
  history: ProofDownloadHistoryEntry[];
};

export function DownloadHistory({ history }: DownloadHistoryProps) {
  return (
    <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
      <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Download History</h2>
      {history.length === 0 ? (
        <p style={{ color: colors.muted, fontSize: typography.small, marginTop: spacing.sm }}>
          No proof download activity recorded for this session.
        </p>
      ) : (
        <ul style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
          {history.map((entry) => (
            <li key={entry.id} style={{ border: `1px solid ${colors.slate100}`, borderRadius: radius.sm, padding: spacing.md }}>
              <div style={{ color: colors.text, fontSize: typography.small, fontWeight: 600 }}>{entry.details}</div>
              <div style={{ color: colors.muted, fontSize: typography.caption, marginTop: spacing.xs }}>
                {entry.performedByUserId} at {formatDateTime(entry.performedAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
