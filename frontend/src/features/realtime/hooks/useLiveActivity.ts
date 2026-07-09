import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { realtimeService } from '../services/realtimeService';

export function useLiveActivity(workspaceId: number | undefined) {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const query = useQuery({
    queryKey: ['live-activity', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return { content: [], totalElements: 0, totalPages: 0, size: 0, number: 0 };
      // Pass abort signal to axios config if supported
      return realtimeService.getWorkspaceActivity(workspaceId, 0, 15);
    },
    enabled: !!workspaceId,
    // Poll every 10 seconds if tab is visible, otherwise disable polling
    refetchInterval: isVisible ? 10000 : false,
    staleTime: 5000,
  });

  return {
    activities: query.data?.content || [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
    error: query.error
  };
}
