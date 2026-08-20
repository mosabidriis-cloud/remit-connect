import type { FormEvent } from "react";
import { colors, radius, spacing, typography } from "../theme";
import type { HoldReason } from "../types/holdReason";

type HoldTransactionDialogProps = {
  holdReasons: HoldReason[];
  onHold: (holdReasonId: string, comment: string) => void;
};

/** Mirrors ReturnTransactionDialog.tsx's shape exactly - a predefined reason plus an optional comment, captured at the moment a transaction is put on hold. */
export function HoldTransactionDialog({ holdReasons, onHold }: HoldTransactionDialogProps) {
  const activeHoldReasons = holdReasons.filter((reason) => reason.isActive);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onHold(String(formData.get("holdReasonId") ?? ""), String(formData.get("comment") ?? ""));
    event.currentTarget.reset();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        display: "grid",
        gap: spacing.sm,
        padding: spacing.md,
      }}
    >
      <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Put On Hold</h2>
      <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
        Hold Reason
        <select
          name="holdReasonId"
          required
          style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}
        >
          <option value="">Select reason</option>
          {activeHoldReasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
        Comment (optional)
        <textarea
          name="comment"
          style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, minHeight: 80, padding: `${spacing.sm}px ${spacing.md}px` }}
        />
      </label>
      <div>
        <button
          className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-1"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.warning}`,
            borderRadius: radius.md,
            color: colors.amber700,
            cursor: "pointer",
            fontSize: typography.small,
            fontWeight: 600,
            padding: `${spacing.sm}px ${spacing.md}px`,
          }}
          type="submit"
        >
          Put On Hold
        </button>
      </div>
    </form>
  );
}
