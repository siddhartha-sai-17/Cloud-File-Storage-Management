import { apiClient } from '../../../api/axios';

export type ShareType = 'PUBLIC' | 'PRIVATE' | 'INTERNAL' | 'ANONYMOUS';
export type SharePermission = 'VIEW' | 'DOWNLOAD' | 'EDIT';

export interface ShareLinkDto {
  id: string;
  token: string;
  fileId: number;
  fileName: string;
  shareType: ShareType;
  permission: SharePermission;
  active: boolean;
  allowPreview: boolean;
  allowDownload: boolean;
  passwordRequired: boolean;
  downloadLimit: number | null;
  downloadCount: number;
  viewCount: number;
  expiresAt: string | null;
  createdAt: string;
  createdByUsername: string;
  targetUsernames?: string[];
}

export interface CreateShareRequest {
  fileId: number;
  shareType: ShareType;
  permission: SharePermission;
  allowPreview?: boolean;
  allowDownload?: boolean;
  password?: string;
  downloadLimit?: number;
  expiresAt?: string;
  targetUsernames?: string[];
}

export interface UpdateShareRequest {
  permission?: SharePermission;
  allowPreview?: boolean;
  allowDownload?: boolean;
  downloadLimit?: number;
  expiresAt?: string;
}

export interface ShareStatisticsDto {
  shareId: string;
  totalViews: number;
  totalDownloads: number;
  uniqueVisitors: number;
  lastAccessedAt: string | null;
}

export interface FilePermissionDto {
  id: number;
  fileId: number;
  fileFilename: string;
  username: string;
  permission: string;
  grantedByUsername: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface FilePermissionGrantRequest {
  username: string;
  permission: string;
  durationMinutes?: number;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const sharingService = {
  // POST /api/shares
  createShare: async (request: CreateShareRequest): Promise<ShareLinkDto> => {
    const response = await apiClient.post<ShareLinkDto>('/api/shares', request);
    return response.data;
  },

  // GET /api/shares — paginated
  getMyShares: async (page = 0, size = 20): Promise<PaginatedResponse<ShareLinkDto>> => {
    const response = await apiClient.get<PaginatedResponse<ShareLinkDto>>('/api/shares', {
      params: { page, size, sortBy: 'createdAt', direction: 'DESC' },
    });
    return response.data;
  },

  // GET /api/shares/{id}
  getShare: async (id: string): Promise<ShareLinkDto> => {
    const response = await apiClient.get<ShareLinkDto>(`/api/shares/${id}`);
    return response.data;
  },

  // PUT /api/shares/{id}
  updateShare: async (id: string, request: UpdateShareRequest): Promise<ShareLinkDto> => {
    const response = await apiClient.put<ShareLinkDto>(`/api/shares/${id}`, request);
    return response.data;
  },

  // DELETE /api/shares/{id}
  deleteShare: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/shares/${id}`);
  },

  // POST /api/shares/{id}/revoke
  revokeShare: async (id: string): Promise<void> => {
    await apiClient.post(`/api/shares/${id}/revoke`);
  },

  // GET /api/shares/{id}/statistics
  getStatistics: async (id: string): Promise<ShareStatisticsDto> => {
    const response = await apiClient.get<ShareStatisticsDto>(`/api/shares/${id}/statistics`);
    return response.data;
  },

  // GET /api/shares/{id}/qr
  getQrCode: async (id: string, format: 'PNG' | 'SVG' = 'PNG', width = 250, height = 250): Promise<Blob> => {
    const response = await apiClient.get(`/api/shares/${id}/qr`, {
      params: { format, width, height },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  // POST /api/shares/{id}/sign
  signUrl: async (id: string, ttlSeconds = 3600): Promise<string> => {
    const response = await apiClient.post<{ signedUrl: string }>(`/api/shares/${id}/sign`, null, {
      params: { ttlSeconds },
    });
    return response.data.signedUrl;
  },

  // File permissions: POST /api/files/{id}/permissions
  grantFilePermission: async (fileId: number, request: FilePermissionGrantRequest): Promise<FilePermissionDto> => {
    const response = await apiClient.post<FilePermissionDto>(`/api/files/${fileId}/permissions`, request);
    return response.data;
  },

  // GET /api/files/{id}/permissions
  getFilePermissions: async (fileId: number): Promise<FilePermissionDto[]> => {
    const response = await apiClient.get<FilePermissionDto[]>(`/api/files/${fileId}/permissions`);
    return response.data;
  },

  // DELETE /api/files/{id}/permissions/{permissionId}
  revokeFilePermission: async (fileId: number, permissionId: number): Promise<void> => {
    await apiClient.delete(`/api/files/${fileId}/permissions/${permissionId}`);
  },
};
