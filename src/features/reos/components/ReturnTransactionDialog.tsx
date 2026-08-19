import type { FormEvent } from "react";
import { colors, radius, spacing, typography } from "../theme";
import type { ReturnReason } from "../types/returnReason";

type ReturnTransactionDialogProps = {
  returnReasons: ReturnReason[];
  onReturn: (returnReasonId: string, comment: string) => void;
};

export function ReturnTransactionDialog({ returnReasons, onReturn }: ReturnTransactionDialogProps) {
  const activeReturnReasons = returnReasons.filter((reason) => reason.isActive);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onReturn(String(formData.get("returnReasonId") ?? ""), String(formData.get("comment") ?? ""));
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
      <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Return Transaction</h2>
      <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
        Return Reason
        <select
          name="returnReasonId"
          required
          style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}
        >
          <option value="">Select reason</option>
          {activeReturnReasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs }}>
        Comment
        <textarea
          name="comment"
          style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, minHeight: 80, padding: `${spacing.sm}px ${spacing.md}px` }}
        />
      </label>
      <div>
        <button
          className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-1"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.danger}`,
            borderRadius: radius.md,
            color: colors.danger,
            cursor: "pointer",
            fontSize: typography.small,
            fontWeight: 600,
            padding: `${spacing.sm}px ${spacing.md}px`,
          }}
          type="submit"
        >
          Return Transaction
        </button>
      </div>
    </form>
  );
}
