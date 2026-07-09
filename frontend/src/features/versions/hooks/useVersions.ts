import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versionService } from '../services/version.service';
import { toast } from 'sonner';

export function useVersions(fileId: number) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  // Query: Paginated Version history
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['file-versions', fileId, page],
    queryFn: () => versionService.getVersions(fileId, page, 10),
  });

  // Mutation: Restore Version
  const restoreMutation = useMutation({
    mutationFn: (versionId: number) => versionService.restoreVersion(fileId, versionId),
    onSuccess: (data) => {
      toast.success(`Successfully restored to Version v${data.versionNumber}`);
      queryClient.invalidateQueries({ queryKey: ['file-browser'] });
      queryClient.invalidateQueries({ queryKey: ['file-versions', fileId] });
      queryClient.invalidateQueries({ queryKey: ['storage-analytics'] });
    },
    onError: () => {
      toast.error('Failed to restore selected file version');
    },
  });

  // Mutation: Delete Version
  const deleteMutation = useMutation({
    mutationFn: (versionId: number) => versionService.deleteVersion(fileId, versionId),
    onSuccess: () => {
      toast.success('Version history entry deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['file-versions', fileId] });
      queryClient.invalidateQueries({ queryKey: ['storage-analytics'] });
    },
    onError: () => {
      toast.error('Failed to delete version index');
    },
  });

  // Action: Download version blob
  const downloadVersion = async (versionId: number, filename: string, versionNumber: number) => {
    try {
      const blob = await versionService.downloadVersion(fileId, versionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Append version marker to download name
      const parts = filename.split('.');
      const ext = parts.pop();
      const base = parts.join('.');
      a.download = `${base}_v${versionNumber}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download version file');
    }
  };

  return {
    versions: data?.content || [],
    totalPages: data?.totalPages || 0,
    currentPage: page,
    setPage,
    isLoading,
    error,
    refetch,
    restoreVersion: restoreMutation.mutate,
    isRestoring: restoreMutation.isPending,
    deleteVersion: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    downloadVersion,
  };
}
