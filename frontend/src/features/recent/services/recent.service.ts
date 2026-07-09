import { apiClient } from '@/api/axios';
import type { StorageItem } from '@/features/storage/types';

export interface RecentPageResponse {
  content: StorageItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const recentService = {
  getRecent: async (type = 'ALL', page = 0, size = 20): Promise<RecentPageResponse> => {
    const response = await apiClient.get<RecentPageResponse>('/api/recent', {
      params: { type, page, size },
    });
    return response.data;
  },
};
