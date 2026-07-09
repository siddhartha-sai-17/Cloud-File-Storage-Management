import { apiClient } from '@/api/axios';
import { type OcrStatistics } from '../types';

export interface OcrStatusResponse {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NONE';
}

export const ocrService = {
  getStatus: async (fileId: number): Promise<OcrStatusResponse> => {
    const response = await apiClient.get<OcrStatusResponse>(`/api/ocr/status/${fileId}`);
    return response.data;
  },

  getStatistics: async (): Promise<OcrStatistics> => {
    const response = await apiClient.get<OcrStatistics>('/api/ocr/statistics');
    return response.data;
  },

  reindex: async (fileId: number): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/api/ocr/reindex/${fileId}`);
    return response.data;
  },
};
