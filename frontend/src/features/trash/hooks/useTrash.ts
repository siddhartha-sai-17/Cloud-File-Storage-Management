import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trashService } from '../services/trash.service';
import type { BulkTrashRequest } from '../types';
import { toast } from 'sonner';

export function useTrash() {
  const queryClient = useQueryClient();

  const trashQuery = useQuery({
    queryKey: ['trash'],
    queryFn: () => trashService.listTrash(),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, isFolder }: { id: number; isFolder: boolean }) =>
      trashService.restoreItem(id, isFolder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage-items'] });
      toast.success('Item restored successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to restore item');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, isFolder }: { id: number; isFolder: boolean }) =>
      trashService.permanentDelete(id, isFolder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Permanently deleted item');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete permanently');
    },
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: (req: BulkTrashRequest) => trashService.bulkRestore(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['storage-items'] });
      toast.success('Bulk restore completed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed bulk restore');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (req: BulkTrashRequest) => trashService.bulkPermanentDelete(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      toast.success('Bulk permanent delete completed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed bulk permanent delete');
    },
  });

  return {
    trashItems: trashQuery.data || [],
    isLoading: trashQuery.isLoading,
    isError: trashQuery.isError,
    restoreItem: restoreMutation.mutateAsync,
    permanentDelete: deleteMutation.mutateAsync,
    bulkRestore: bulkRestoreMutation.mutateAsync,
    bulkPermanentDelete: bulkDeleteMutation.mutateAsync,
  };
}
