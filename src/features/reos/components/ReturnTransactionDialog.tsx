import type { FormEvent } from "react";
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
  };

  return (
    <form className="grid gap-3 rounded border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
      <h2 className="text-base font-semibold text-slate-950">Return Transaction</h2>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Return Reason
        <select className="rounded border border-slate-300 px-3 py-2" name="returnReasonId" required>
          <option value="">Select reason</option>
          {activeReturnReasons.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">
        Comment
        <textarea className="min-h-20 rounded border border-slate-300 px-3 py-2" name="comment" />
      </label>
      <div>
        <button className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700" type="submit">
          Return Transaction
        </button>
      </div>
    </form>
  );
}
