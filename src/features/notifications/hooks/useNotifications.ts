import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../services/notificationsApi";
import { useAuthStore } from "../../auth/store/useAuthStore";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

/**
 * Fetch paginated notifications for the current user
 */
export const useNotifications = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, page, limit],
    queryFn: () => notificationsApi.getNotifications({ page, limit }),
    staleTime: 30_000,
  });
};

/**
 * Mark a notification as read, then update the cache
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      // Also refresh the currentUser to update badge count
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

/**
 * Toggle notification paused/enabled setting
 */
export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      notificationsPaused: boolean;
      notificationRadiusMeters?: number;
    }) => notificationsApi.updateNotificationSettings(payload),
    onSuccess: (user) => {
      useAuthStore.getState().updateUser(user);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};
