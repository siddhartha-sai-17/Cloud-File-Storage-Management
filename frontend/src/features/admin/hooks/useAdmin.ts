import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';
import { toast } from 'sonner';

export function useAdmin() {
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminService.getStats(),
  });

  const duplicatesQuery = useQuery({
    queryKey: ['duplicate-report'],
    queryFn: () => adminService.getDuplicateGroups(),
  });

  const dupStatsQuery = useQuery({
    queryKey: ['duplicate-stats'],
    queryFn: () => adminService.getDuplicateStats(),
  });

  const configsQuery = useQuery({
    queryKey: ['storage-config'],
    queryFn: () => adminService.getConfigs(),
  });

  const configMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminService.updateConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-config'] });
      toast.success('Configuration updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update configuration');
    },
  });

  return {
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    isErrorStats: statsQuery.isError,

    duplicates: duplicatesQuery.data || [],
    isLoadingDuplicates: duplicatesQuery.isLoading,

    dupStats: dupStatsQuery.data,
    isLoadingDupStats: dupStatsQuery.isLoading,

    configs: configsQuery.data || [],
    isLoadingConfigs: configsQuery.isLoading,

    updateConfig: configMutation.mutateAsync,
    isUpdatingConfig: configMutation.isPending,
  };
}
