import { apiClient } from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { NotificationListResponse } from "../types";

export const notificationsApi = {
  /**
   * Get current user's notifications (paginated)
   */
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    read?: string;
  }): Promise<NotificationListResponse> => {
    const { data } = await apiClient.get<any>(ENDPOINTS.NOTIFICATIONS.LIST, {
      params,
    });
    return data?.data || data;
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (
    notificationId: string
  ): Promise<{ id: string; readAt: string }> => {
    const { data } = await apiClient.patch<any>(
      `${ENDPOINTS.NOTIFICATIONS.LIST}/${notificationId}/read`
    );
    return data?.data || data;
  },

  /**
   * Update notification paused/enabled preference
   */
  updateNotificationSettings: async (payload: {
    notificationsPaused: boolean;
    notificationRadiusMeters?: number;
  }): Promise<{
    id: string;
    notificationsPaused: boolean;
    notificationRadiusMeters?: number;
  }> => {
    const { data } = await apiClient.patch<any>(
      ENDPOINTS.NOTIFICATIONS.SETTINGS,
      payload
    );
    return data?.data || data;
  },
};
