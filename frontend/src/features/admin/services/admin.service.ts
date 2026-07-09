import { apiClient } from '@/api/axios';
import type { StorageItem } from '@/features/storage/types';

export interface AdminStatsDto {
  totalUsers: number;
  activeUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalWorkspaces: number;
  totalStorageBytes: number;
  totalUploads: number;
  totalDownloads: number;
  totalOcrJobs: number;
  totalSearches: number;
  totalShares: number;
  totalVersions: number;
  totalNotifications: number;
  storageByType: Record<string, number>;
  activityOverTime: Record<string, number>;
}

export interface DuplicateGroupDto {
  sha256: string;
  fileCount: number;
  totalSize: number;
  potentialSavings: number;
  duplicates: StorageItem[];
}

export interface SystemConfigDto {
  key: string;
  value: string;
  updatedAt: string;
}

export const adminService = {
  getStats: async (): Promise<AdminStatsDto> => {
    const response = await apiClient.get<AdminStatsDto>('/api/admin/stats');
    return response.data;
  },

  getDuplicateGroups: async (): Promise<DuplicateGroupDto[]> => {
    const response = await apiClient.get<DuplicateGroupDto[]>('/api/admin/duplicates/report');
    return response.data;
  },

  getDuplicateStats: async (): Promise<Record<string, any>> => {
    const response = await apiClient.get<Record<string, any>>('/api/admin/duplicates/stats');
    return response.data;
  },

  getConfigs: async (): Promise<SystemConfigDto[]> => {
    const response = await apiClient.get<SystemConfigDto[]>('/api/admin/config');
    return response.data;
  },

  updateConfig: async (key: string, value: string): Promise<SystemConfigDto> => {
    const response = await apiClient.post<SystemConfigDto>('/api/admin/config', null, {
      params: { key, value },
    });
    return response.data;
  },
};
