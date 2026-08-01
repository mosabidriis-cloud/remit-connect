type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
      {message}
    </div>
  );
}
