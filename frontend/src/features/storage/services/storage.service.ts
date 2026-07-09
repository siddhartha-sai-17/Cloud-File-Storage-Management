import { apiClient } from '@/api/axios';
import { type StorageItem, type StorageAnalytics } from '../types';

export const storageService = {
  listItems: async (folderId?: number): Promise<StorageItem[]> => {
    const response = await apiClient.get<StorageItem[]>('/api/storage', {
      params: folderId !== undefined ? { folderId } : {},
    });
    return response.data;
  },

  createFolder: async (name: string, parentId?: number): Promise<void> => {
    await apiClient.post('/api/storage/folder', null, {
      params: {
        name,
        ...(parentId !== undefined ? { parentId } : {}),
      },
    });
  },

  uploadSingleFile: async (file: File, folderId?: number): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.post('/api/storage/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: folderId !== undefined ? { folderId } : {},
    });
  },

  downloadFile: async (id: number, filename: string): Promise<void> => {
    const response = await apiClient.get(`/api/storage/download/${id}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  listStarred: async (): Promise<StorageItem[]> => {
    const response = await apiClient.get<StorageItem[]>('/api/storage/starred');
    return response.data;
  },

  toggleStar: async (id: number): Promise<void> => {
    await apiClient.post(`/api/storage/star/${id}`);
  },

  rename: async (id: number, isFolder: boolean, newName: string): Promise<void> => {
    await apiClient.post('/api/storage/rename', null, {
      params: { id, isFolder, newName },
    });
  },

  softDelete: async (id: number, isFolder: boolean): Promise<void> => {
    await apiClient.post('/api/storage/delete', null, {
      params: { id, isFolder },
    });
  },

  restore: async (id: number, isFolder: boolean): Promise<void> => {
    await apiClient.post('/api/storage/restore', null, {
      params: { id, isFolder },
    });
  },

  permanentDelete: async (id: number, isFolder: boolean): Promise<void> => {
    await apiClient.delete('/api/storage/permanent', {
      params: { id, isFolder },
    });
  },

  copy: async (id: number, isFolder: boolean, targetFolderId?: number): Promise<void> => {
    await apiClient.post('/api/storage/copy', null, {
      params: {
        id,
        isFolder,
        ...(targetFolderId !== undefined ? { targetFolderId } : {}),
      },
    });
  },

  move: async (id: number, isFolder: boolean, targetFolderId?: number): Promise<void> => {
    await apiClient.post('/api/storage/move', null, {
      params: {
        id,
        isFolder,
        ...(targetFolderId !== undefined ? { targetFolderId } : {}),
      },
    });
  },

  getAnalytics: async (): Promise<StorageAnalytics> => {
    const response = await apiClient.get<StorageAnalytics>('/api/storage/analytics');
    return response.data;
  },
};
