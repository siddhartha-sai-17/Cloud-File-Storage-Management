import { apiClient } from '@/api/axios';
import type { TrashItemDto, BulkTrashRequest } from '../types';

export const trashService = {
  listTrash: async (): Promise<TrashItemDto[]> => {
    const response = await apiClient.get<TrashItemDto[]>('/api/trash');
    return response.data;
  },

  restoreItem: async (id: number, isFolder: boolean): Promise<void> => {
    await apiClient.post(`/api/trash/${id}/restore`, null, {
      params: { isFolder },
    });
  },

  permanentDelete: async (id: number, isFolder: boolean): Promise<void> => {
    await apiClient.delete(`/api/trash/${id}`, {
      params: { isFolder },
    });
  },

  bulkRestore: async (request: BulkTrashRequest): Promise<void> => {
    await apiClient.post('/api/trash/restore/bulk', request);
  },

  bulkPermanentDelete: async (request: BulkTrashRequest): Promise<void> => {
    await apiClient.post('/api/trash/delete/bulk', request);
  },
};
