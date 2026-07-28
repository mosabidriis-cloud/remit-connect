import type { SharedBatchLifecycleStatus } from "../types/sharedBatch";

type BatchLifecycleBadgeProps = {
  status: SharedBatchLifecycleStatus;
};

const statusStyles: Record<SharedBatchLifecycleStatus, string> = {
  ASSIGNED: "border-sky-200 bg-sky-50 text-sky-700",
  PROCESSING: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-violet-200 bg-violet-50 text-violet-700",
  READY_FOR_DOWNLOAD: "border-indigo-200 bg-indigo-50 text-indigo-700",
  DOWNLOADED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const statusLabels: Record<SharedBatchLifecycleStatus, string> = {
  ASSIGNED: "Assigned",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  READY_FOR_DOWNLOAD: "Ready for Download",
  DOWNLOADED: "Downloaded",
};

export function BatchLifecycleBadge({ status }: BatchLifecycleBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
