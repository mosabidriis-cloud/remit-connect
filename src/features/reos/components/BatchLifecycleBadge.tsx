import { StatusBadge } from "./common/StatusBadge";
import type { SharedBatchLifecycleStatus } from "../types/sharedBatch";

type BatchLifecycleBadgeProps = {
  status: SharedBatchLifecycleStatus;
};

const statusLabels: Record<SharedBatchLifecycleStatus, string> = {
  ASSIGNED: "Assigned",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  READY_FOR_DOWNLOAD: "Ready for Download",
  DOWNLOADED: "Downloaded",
};

const toneMap: Record<SharedBatchLifecycleStatus, "blue" | "emerald" | "red" | "slate" | "amber"> = {
  ASSIGNED: "blue",
  PROCESSING: "amber",
  COMPLETED: "emerald",
  READY_FOR_DOWNLOAD: "blue",
  DOWNLOADED: "emerald",
};

export function BatchLifecycleBadge({ status }: BatchLifecycleBadgeProps) {
  return <StatusBadge label={statusLabels[status]} tone={toneMap[status]} />;
}
