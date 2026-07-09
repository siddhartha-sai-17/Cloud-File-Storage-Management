import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRealtime } from '@/contexts/RealtimeProvider';
import type { UploadProgressDto } from '../types';
import { apiClient } from '@/api/axios';

export function useUploadSocket(sessionId: string | null) {
  const { status, subscribeUpload, unsubscribeUpload } = useRealtime();

  // Set up subscription to WebSocket for this session ID
  useEffect(() => {
    if (!sessionId) return;
    subscribeUpload(sessionId);
    return () => {
      unsubscribeUpload(sessionId);
    };
  }, [sessionId, subscribeUpload, unsubscribeUpload]);

  // Use Query for the session progress.
  // It retrieves updates from WebSocket directly because WebSocket writes to the ['upload-progress', sessionId] query cache key.
  // If the socket isn't connected (status !== 'CONNECTED'), we enable REST polling as a fallback.
  const { data: progress, isLoading, error } = useQuery<UploadProgressDto>({
    queryKey: ['upload-progress', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID');
      const response = await apiClient.get<UploadProgressDto>(`/api/uploads/session/${sessionId}/progress`);
      return response.data;
    },
    enabled: !!sessionId,
    refetchInterval: status !== 'CONNECTED' ? 3000 : false, // Fallback to 3s polling if socket is down
    staleTime: Infinity, // Rely on WS updates or periodic polling
  });

  return {
    progress,
    isLoading,
    isSocketConnected: status === 'CONNECTED',
    error
  };
}
