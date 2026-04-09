import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAppNotifications,
  markAllAppNotificationsRead,
  markAppNotificationRead,
} from "@/lib/notifications-api.js";

export function useAppNotifications(unread?: boolean, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["app-notifications", unread ?? "all"],
    queryFn: () => fetchAppNotifications(unread),
    enabled: options?.enabled !== false,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkAppNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAppNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-notifications"] }).catch(() => undefined);
    },
  });
}

export function useMarkAllAppNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllAppNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-notifications"] }).catch(() => undefined);
    },
  });
}
