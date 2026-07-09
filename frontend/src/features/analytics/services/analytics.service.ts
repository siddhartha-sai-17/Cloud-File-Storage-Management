import { apiClient } from '@/api/axios';
import type { StorageItem } from '@/features/storage/types';

export interface StorageAnalyticsDto {
  workspaceId: number;
  storageUsed: number;
  growthPercentage: number;
  largestFiles: StorageItem[];
  mostDownloaded: StorageItem[];
  mostViewed: StorageItem[];
  mostShared: StorageItem[];
  storageByFileType: Record<string, number>;
  storageByOwner: Record<string, number>;
  dailyUploadGraph: Record<string, number>;
  monthlyUploadGraph: Record<string, number>;
  activityHeatmap: Record<string, number>;
}

export const analyticsService = {
  getAnalytics: async (workspaceId: number): Promise<StorageAnalyticsDto> => {
    const response = await apiClient.get<StorageAnalyticsDto>(`/api/workspaces/${workspaceId}/analytics`);
    return response.data;
  },
};
