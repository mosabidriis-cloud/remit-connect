import type { SharedBatchValidationIssue } from "../types/sharedBatchImport";

type SharedBatchValidationSummaryProps = {
  issues: SharedBatchValidationIssue[];
};

export function SharedBatchValidationSummary({ issues }: SharedBatchValidationSummaryProps) {
  if (issues.length === 0) {
    return (
      <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Batch validation completed with no issues.
      </div>
    );
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <h2 className="text-base font-semibold text-slate-950">Validation Results</h2>
      <ul className="mt-3 grid gap-2">
        {issues.map((issue, index) => (
          <li className="flex gap-3 text-sm" key={`${issue.rowNumber}-${issue.field}-${index}`}>
            <span
              className={
                issue.severity === "ERROR"
                  ? "font-semibold text-red-700"
                  : "font-semibold text-amber-700"
              }
            >
              {issue.severity}
            </span>
            <span className="text-slate-700">
              Row {issue.rowNumber}, {issue.field}: {issue.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
