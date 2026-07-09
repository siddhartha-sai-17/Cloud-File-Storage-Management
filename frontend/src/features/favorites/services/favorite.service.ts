import { apiClient } from '@/api/axios';
import type { FavoritesPageResponse } from '../types';

export const favoriteService = {
  listFavorites: async (page = 0, size = 20): Promise<FavoritesPageResponse> => {
    const response = await apiClient.get<FavoritesPageResponse>('/api/favorites', {
      params: { page, size },
    });
    return response.data;
  },

  starFile: async (fileId: number): Promise<void> => {
    await apiClient.post(`/api/favorites/${fileId}`);
  },

  unstarFile: async (fileId: number): Promise<void> => {
    await apiClient.delete(`/api/favorites/${fileId}`);
  },

  getStats: async (): Promise<Record<string, any>> => {
    const response = await apiClient.get<Record<string, any>>('/api/favorites/stats');
    return response.data;
  },
};
