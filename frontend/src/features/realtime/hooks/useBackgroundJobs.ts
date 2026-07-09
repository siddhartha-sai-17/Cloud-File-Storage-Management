import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { realtimeService } from '../services/realtimeService';
import { toast } from 'sonner';

export function useBackgroundJobs() {
  const queryClient = useQueryClient();

  const queueQuery = useQuery({
    queryKey: ['upload-queue'],
    queryFn: () => realtimeService.getUploadQueueAll(),
    refetchInterval: 10000, // Poll every 10s
  });

  const queueStatsQuery = useQuery({
    queryKey: ['upload-queue-stats'],
    queryFn: () => realtimeService.getUploadQueueStats(),
    refetchInterval: 10000,
  });

  const ocrStatsQuery = useQuery({
    queryKey: ['ocr-statistics'],
    queryFn: () => realtimeService.getOcrStatistics(),
    refetchInterval: 15000, // Poll every 15s
  });

  const promoteMutation = useMutation({
    mutationFn: (sessionId: string) => realtimeService.promoteUploadSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-queue'] });
      queryClient.invalidateQueries({ queryKey: ['upload-queue-stats'] });
      toast.success('Session promoted to HIGH priority');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to promote upload session');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (sessionId: string) => realtimeService.cancelUploadSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-queue'] });
      queryClient.invalidateQueries({ queryKey: ['upload-queue-stats'] });
      toast.success('Upload session cancelled and removed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel upload session');
    }
  });

  const reindexAllMutation = useMutation({
    mutationFn: () => realtimeService.reindexAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocr-statistics'] });
      toast.success('Reindexing queued for all files');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to trigger reindexing');
    }
  });

  return {
    queue: queueQuery.data || [],
    isLoadingQueue: queueQuery.isLoading,
    queueStats: queueStatsQuery.data || {},
    ocrStats: ocrStatsQuery.data,
    isLoadingOcrStats: ocrStatsQuery.isLoading,
    promoteSession: promoteMutation.mutateAsync,
    isPromoting: promoteMutation.isPending,
    cancelSession: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    reindexAll: reindexAllMutation.mutateAsync,
    isReindexingAll: reindexAllMutation.isPending,
  };
}
