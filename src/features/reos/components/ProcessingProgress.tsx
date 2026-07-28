type ProcessingProgressProps = {
  currentPosition: number;
  totalTransactions: number;
};

export function ProcessingProgress({ currentPosition, totalTransactions }: ProcessingProgressProps) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <span className="text-xs font-semibold uppercase text-slate-500">Current Position</span>
      <div className="mt-1 text-3xl font-semibold text-slate-950">
        {currentPosition} / {totalTransactions}
      </div>
    </div>
  );
}
