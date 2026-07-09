import { apiClient } from '@/api/axios';
import { type FileVersionDtoResponse } from '../types';
import { type PageResponse } from '../../storage/types';

export const versionService = {
  getVersions: async (
    fileId: number,
    page = 0,
    size = 10
  ): Promise<PageResponse<FileVersionDtoResponse>> => {
    const response = await apiClient.get<PageResponse<FileVersionDtoResponse>>(
      `/api/files/${fileId}/versions`,
      { params: { page, size } }
    );
    return response.data;
  },

  restoreVersion: async (fileId: number, versionId: number): Promise<FileVersionDtoResponse> => {
    const response = await apiClient.post<FileVersionDtoResponse>(
      `/api/files/${fileId}/versions/${versionId}/restore`
    );
    return response.data;
  },

  deleteVersion: async (fileId: number, versionId: number): Promise<void> => {
    await apiClient.delete(`/api/files/${fileId}/versions/${versionId}`);
  },

  downloadVersion: async (fileId: number, versionId: number): Promise<Blob> => {
    const response = await apiClient.get<Blob>(
      `/api/files/${fileId}/versions/${versionId}/download`,
      { responseType: 'blob' }
    );
    return response.data;
  },
};
