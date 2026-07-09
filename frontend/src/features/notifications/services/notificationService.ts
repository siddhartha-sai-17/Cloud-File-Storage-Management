import { apiClient } from '../../../api/axios';

export interface NotificationDto {
  id: number;
  userId: number;
  workspaceId: number | null;
  notificationType: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: number | null;
  read: boolean;
  createdAt: string;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const notificationService = {
  // GET /api/notifications — paginated list
  getNotifications: async (page = 0, size = 20, workspaceId?: number): Promise<PaginatedResponse<NotificationDto>> => {
    const params: Record<string, unknown> = { page, size };
    if (workspaceId) params.workspaceId = workspaceId;
    const response = await apiClient.get<PaginatedResponse<NotificationDto>>('/api/notifications', { params });
    return response.data;
  },

  // GET /api/notifications/unread
  getUnread: async (workspaceId?: number): Promise<NotificationDto[]> => {
    const params: Record<string, unknown> = {};
    if (workspaceId) params.workspaceId = workspaceId;
    const response = await apiClient.get<NotificationDto[]>('/api/notifications/unread', { params });
    return response.data;
  },

  // GET /api/notifications/unread/count
  getUnreadCount: async (workspaceId?: number): Promise<number> => {
    const params: Record<string, unknown> = {};
    if (workspaceId) params.workspaceId = workspaceId;
    const response = await apiClient.get<number>('/api/notifications/unread/count', { params });
    return response.data;
  },

  // PUT /api/notifications/{id}/read — mark single as read
  markAsRead: async (notificationId: number): Promise<void> => {
    await apiClient.put(`/api/notifications/${notificationId}/read`);
  },

  // PUT /api/notifications/read-all
  markAllAsRead: async (workspaceId?: number): Promise<void> => {
    const params: Record<string, unknown> = {};
    if (workspaceId) params.workspaceId = workspaceId;
    await apiClient.put('/api/notifications/read-all', null, { params });
  },

  // DELETE /api/notifications/{id}
  deleteNotification: async (notificationId: number): Promise<void> => {
    await apiClient.delete(`/api/notifications/${notificationId}`);
  },
};
