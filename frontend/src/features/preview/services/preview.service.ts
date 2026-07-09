import { apiClient } from '@/api/axios';
import { type PreviewDto } from '../types';

export const previewService = {
  getMetadata: async (id: number): Promise<PreviewDto> => {
    const response = await apiClient.get<PreviewDto>(`/api/files/${id}/preview`);
    return response.data;
  },

  downloadBlob: async (id: number, signal?: AbortSignal): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`/api/storage/download/${id}`, {
      responseType: 'blob',
      signal,
    });
    return response.data;
  },
};
