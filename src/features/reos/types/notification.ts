export type NotificationType = "BATCH_ASSIGNED";
export type NotificationEntityType = "SHARED_BATCH";

/** A recipient-scoped in-app notification. RLS restricts SELECT/UPDATE to recipientUserId = the caller. */
export interface Notification {
  id: string;
  recipientUserId: string;
  branchId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: string;
  isRead: boolean;
  createdAt: string;
}
