import { useQuery } from '@tanstack/react-query';
import { recentService } from '../services/recent.service';

export function useRecentFiles(type = 'ALL', page = 0, size = 20) {
  const query = useQuery({
    queryKey: ['recent-files', type, page, size],
    queryFn: () => recentService.getRecent(type, page, size),
  });

  return {
    recentItems: query.data?.content || [],
    totalElements: query.data?.totalElements || 0,
    totalPages: query.data?.totalPages || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
