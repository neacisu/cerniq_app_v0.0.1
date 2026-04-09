import { api } from "./api.js";

export type AppNotificationRow = {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  sentAt: string;
  createdAt: string;
};

export type AppNotificationsResponse = {
  success: boolean;
  data: { items: AppNotificationRow[]; unreadCount: number };
};

export async function fetchAppNotifications(unread?: boolean): Promise<AppNotificationsResponse> {
  const params = new URLSearchParams();
  params.set("limit", "50");
  if (unread === true) params.set("unread", "true");
  return api.get<AppNotificationsResponse>(`/api/v1/notifications?${params.toString()}`);
}

export async function markAppNotificationRead(id: string): Promise<void> {
  await api.patch(`/api/v1/notifications/${id}/read`, {});
}

export async function markAllAppNotificationsRead(): Promise<void> {
  await api.post(`/api/v1/notifications/read-all`, {});
}
