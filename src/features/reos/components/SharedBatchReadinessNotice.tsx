type SharedBatchReadinessNoticeProps = {
  canCreateSharedBatch: boolean;
  manualReviewCount: number;
};

export function SharedBatchReadinessNotice({
  canCreateSharedBatch,
  manualReviewCount,
}: SharedBatchReadinessNoticeProps) {
  if (!canCreateSharedBatch) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Shared Batch cannot be created until validation errors are resolved.
      </div>
    );
  }

  return (
    <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
      Shared Batch is ready for branch assignment.
      {manualReviewCount > 0 ? ` ${manualReviewCount} duplicate transaction records require manual review.` : ""}
    </div>
  );
}
