import { apiClient } from '@/api/axios';
import { type AxiosProgressEvent } from 'axios';
import { type UploadSessionResponse, type UploadCompletionResponse } from '../types';

export const uploadService = {
  initSession: async (
    filename: string,
    size: number,
    folderId?: number,
    checksum?: string
  ): Promise<UploadSessionResponse> => {
    const response = await apiClient.post<UploadSessionResponse>('/api/uploads/session', {
      filename,
      size,
      folderId,
      checksum,
    });
    return response.data;
  },

  uploadChunk: async (
    sessionId: string,
    chunkNumber: number,
    chunk: Blob,
    checksum?: string,
    onProgress?: (progressEvent: AxiosProgressEvent) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    const formData = new FormData();
    formData.append('file', chunk);

    await apiClient.post(`/api/uploads/session/${sessionId}/chunk`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(checksum ? { 'X-Upload-Chunk-Checksum': checksum } : {}),
      },
      params: {
        chunkNumber,
        size: chunk.size,
        ...(checksum ? { checksum } : {}),
      },
      onUploadProgress: onProgress,
      signal,
    });
  },

  completeSession: async (
    sessionId: string,
    checksum?: string
  ): Promise<UploadCompletionResponse> => {
    const response = await apiClient.post<UploadCompletionResponse>(
      `/api/uploads/session/${sessionId}/complete`,
      checksum ? { checksum } : {}
    );
    return response.data;
  },

  cancelSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/api/uploads/session/${sessionId}`);
  },
};
