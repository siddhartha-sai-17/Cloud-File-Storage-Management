import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';

export function useAnalytics(workspaceId: number | null) {
  const query = useQuery({
    queryKey: ['analytics', workspaceId],
    queryFn: () => analyticsService.getAnalytics(workspaceId!),
    enabled: workspaceId !== null,
  });

  return {
    analytics: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
