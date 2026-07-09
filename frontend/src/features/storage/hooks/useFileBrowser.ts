import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { storageService } from '../services/storage.service';
import { useSelection } from './useSelection';
import { useFolderNavigation } from './useFolderNavigation';
import { type StorageItem, type SearchResultDto, type PageResponse } from '../types';
import { apiClient } from '@/api/axios';

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export const FILE_BROWSER_QUERY_KEY = 'file-browser';

export function useFileBrowser() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Sort states
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Folder navigation hook
  const { currentFolderId, breadcrumbs, navigateToFolder, navigateBackToBreadcrumb } = useFolderNavigation();

  // Selection hook
  const {
    selectedIds,
    isSelected,
    toggleSelect,
    selectSingle,
    clearSelection,
    toggleSelectAll,
  } = useSelection<StorageItem>();

  // Fetch items (files and folders)
  const {
    data: rawItems = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [FILE_BROWSER_QUERY_KEY, currentFolderId, searchQuery],
    queryFn: async () => {
      if (searchQuery.trim()) {
        const response = await apiClient.get<PageResponse<SearchResultDto>>('/api/search', {
          params: { query: searchQuery, page: 0, size: 100 },
        });
        // Map SearchResultDto (or Page content) to StorageItem
        // Search response is Page<SearchResultDto>
        const content = response.data.content || [];
        return content.map((item: SearchResultDto) => ({
          id: item.fileId || item.entityId || 0,
          name: item.filename || item.title || 'Untitled',
          type: (item.entityType === 'FOLDER' ? 'FOLDER' : 'FILE') as 'FILE' | 'FOLDER',
          size: null,
          createdDate: undefined,
          starred: false,
          category: item.category,
          classification: undefined,
        }));
      }
      return storageService.listItems(currentFolderId);
    },
  });

  // Client-side sorting
  const sortedItems = useMemo(() => {
    if (!rawItems) return [];
    
    return [...rawItems].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        comparison = sizeA - sizeB;
      } else if (sortBy === 'date') {
        const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
        const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === 'type') {
        comparison = a.type.localeCompare(b.type);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [rawItems, sortBy, sortDirection]);

  // Mutations
  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [FILE_BROWSER_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ['storage-analytics'] });
  }, [queryClient]);

  const createFolderMutation = useMutation({
    mutationFn: ({ name }: { name: string }) => storageService.createFolder(name, currentFolderId),
    onSuccess: () => {
      toast.success('Folder created successfully');
      invalidateQueries();
    },
    onError: (err: unknown) => {
      const error = err as AxiosErrorLike;
      toast.error(error.response?.data?.message || 'Failed to create folder');
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, isFolder, newName }: { id: number; isFolder: boolean; newName: string }) =>
      storageService.rename(id, isFolder, newName),
    onSuccess: () => {
      toast.success('Renamed successfully');
      invalidateQueries();
      clearSelection();
    },
    onError: (err: unknown) => {
      const error = err as AxiosErrorLike;
      toast.error(error.response?.data?.message || 'Rename failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, isFolder }: { id: number; isFolder: boolean }) =>
      storageService.softDelete(id, isFolder),
    onSuccess: () => {
      toast.success('Moved to Trash');
      invalidateQueries();
      clearSelection();
    },
    onError: (err: unknown) => {
      const error = err as AxiosErrorLike;
      toast.error(error.response?.data?.message || 'Delete failed');
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: (id: number) => storageService.toggleStar(id),
    onSuccess: () => {
      invalidateQueries();
    },
    onError: (err: unknown) => {
      const error = err as AxiosErrorLike;
      toast.error(error.response?.data?.message || 'Star action failed');
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, isFolder, targetFolderId }: { id: number; isFolder: boolean; targetFolderId?: number }) =>
      storageService.move(id, isFolder, targetFolderId),
    onSuccess: () => {
      toast.success('Item moved successfully');
      invalidateQueries();
      clearSelection();
    },
    onError: (err: unknown) => {
      const error = err as AxiosErrorLike;
      toast.error(error.response?.data?.message || 'Move failed');
    },
  });

  const copyMutation = useMutation({
    mutationFn: ({ id, isFolder, targetFolderId }: { id: number; isFolder: boolean; targetFolderId?: number }) =>
      storageService.copy(id, isFolder, targetFolderId),
    onSuccess: () => {
      toast.success('Item copied successfully');
      invalidateQueries();
      clearSelection();
    },
    onError: (err: unknown) => {
      const error = err as AxiosErrorLike;
      toast.error(error.response?.data?.message || 'Copy failed');
    },
  });

  const handleDownload = useCallback((id: number, name: string) => {
    storageService.downloadFile(id, name).catch((err: unknown) => {
      const error = err as Error;
      toast.error(error.message || 'Download failed');
    });
  }, []);

  return {
    items: sortedItems,
    isLoading,
    isError,
    error,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    currentFolderId,
    breadcrumbs,
    navigateToFolder,
    navigateBackToBreadcrumb,
    
    // Selection
    selectedIds,
    isSelected,
    toggleSelect,
    selectSingle,
    clearSelection,
    toggleSelectAll,

    // Operations
    createFolder: createFolderMutation.mutate,
    isCreatingFolder: createFolderMutation.isPending,
    rename: renameMutation.mutate,
    isRenaming: renameMutation.isPending,
    deleteItem: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    toggleStar: toggleStarMutation.mutate,
    moveItem: moveMutation.mutate,
    copyItem: copyMutation.mutate,
    downloadFile: handleDownload,
    refetch,
  };
}
