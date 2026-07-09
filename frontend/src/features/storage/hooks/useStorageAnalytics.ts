import { useQuery } from '@tanstack/react-query';
import { storageService } from '../services/storage.service';

export const ANALYTICS_QUERY_KEY = ['storage-analytics'];

// Default personal storage quota: 10GB
export const DEFAULT_PERSONAL_QUOTA = 10 * 1024 * 1024 * 1024;

export function useStorageAnalytics() {
  const {
    data: analytics,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ANALYTICS_QUERY_KEY,
    queryFn: storageService.getAnalytics,
    refetchInterval: 30000, // automatic background refresh every 30 seconds
  });

  const storageLimit = DEFAULT_PERSONAL_QUOTA;
  const storageUsed = analytics?.storageUsage || 0;
  const storageAvailable = Math.max(0, storageLimit - storageUsed);
  const usagePercentage = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return {
    analytics,
    storageUsed,
    storageAvailable,
    storageLimit,
    usagePercentage,
    isLoading,
    isError,
    error,
    refetch,
  };
}
