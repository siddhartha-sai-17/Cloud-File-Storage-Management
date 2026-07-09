import { apiClient } from '@/api/axios';
import type {
  ActivityTimelineDto,
  UploadQueueStatusDto,
  OcrStatistics,
  DuplicateGroupDto,
  DuplicateStatsDto
} from '../types';
import type { PageResponse, SearchResultDto } from '@/features/storage/types';

export const realtimeService = {
  // Activity Stream Endpoints
  async getWorkspaceActivity(workspaceId: number, page = 0, size = 20): Promise<PageResponse<ActivityTimelineDto>> {
    const response = await apiClient.get<PageResponse<ActivityTimelineDto>>(`/api/activity/workspace/${workspaceId}`, {
      params: { page, size, sort: 'createdAt,desc' }
    });
    return response.data;
  },

  async getFileActivity(fileId: number, page = 0, size = 20): Promise<PageResponse<ActivityTimelineDto>> {
    const response = await apiClient.get<PageResponse<ActivityTimelineDto>>(`/api/activity/file/${fileId}`, {
      params: { page, size, sort: 'createdAt,desc' }
    });
    return response.data;
  },

  async getUserActivity(userId: number, page = 0, size = 20): Promise<PageResponse<ActivityTimelineDto>> {
    const response = await apiClient.get<PageResponse<ActivityTimelineDto>>(`/api/activity/user/${userId}`, {
      params: { page, size, sort: 'createdAt,desc' }
    });
    return response.data;
  },

  // Upload Queue Endpoints
  async getUploadQueueAll(): Promise<UploadQueueStatusDto[]> {
    const response = await apiClient.get<UploadQueueStatusDto[]>('/api/uploads/queue/all');
    return response.data;
  },

  async getUploadQueueStats(): Promise<Record<string, any>> {
    const response = await apiClient.get<Record<string, any>>('/api/uploads/queue/stats');
    return response.data;
  },

  async promoteUploadSession(sessionId: string): Promise<{ promoted: boolean }> {
    const response = await apiClient.post<{ promoted: boolean }>(`/api/uploads/queue/promote/${sessionId}`);
    return response.data;
  },

  async cancelUploadSession(sessionId: string): Promise<{ cancelled: boolean }> {
    const response = await apiClient.delete<{ cancelled: boolean }>(`/api/uploads/queue/cancel/${sessionId}`);
    return response.data;
  },

  // OCR Processing Endpoints
  async getOcrStatistics(): Promise<OcrStatistics> {
    const response = await apiClient.get<OcrStatistics>('/api/ocr/statistics');
    return response.data;
  },

  async getOcrStatus(fileId: number): Promise<{ status: string }> {
    const response = await apiClient.get<{ status: string }>(`/api/ocr/status/${fileId}`);
    return response.data;
  },

  async reindexFile(fileId: number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/api/ocr/reindex/${fileId}`);
    return response.data;
  },

  async reindexAll(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/api/ocr/reindex/all');
    return response.data;
  },

  // Deduplication & Storage Intelligence
  async getDuplicateReport(): Promise<DuplicateGroupDto[]> {
    const response = await apiClient.get<DuplicateGroupDto[]>('/api/admin/duplicates/report');
    return response.data;
  },

  async getDuplicateStats(): Promise<DuplicateStatsDto> {
    const response = await apiClient.get<DuplicateStatsDto>('/api/admin/duplicates/stats');
    return response.data;
  },

  // Assistant queries wrapper using existing GET /api/search
  async assistantSearch(query: string, page = 0, size = 5): Promise<PageResponse<SearchResultDto>> {
    const response = await apiClient.get<PageResponse<SearchResultDto>>('/api/search', {
      params: { query, page, size }
    });
    return response.data;
  }
};
