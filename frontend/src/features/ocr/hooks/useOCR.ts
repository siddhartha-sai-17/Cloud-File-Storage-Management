import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ocrService } from '../services/ocr.service';
import { toast } from 'sonner';

export function useOCR(fileId: number) {
  const queryClient = useQueryClient();
  const [pollStartTime, setPollStartTime] = useState<number | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ocr-status', fileId],
    queryFn: () => ocrService.getStatus(fileId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      // Start timing when we first notice PENDING or PROCESSING
      if ((status === 'PENDING' || status === 'PROCESSING') && !pollStartTime) {
        setPollStartTime(Date.now());
      }

      // Check for 3-minute frontend timeout safeguard
      if (pollStartTime && Date.now() - pollStartTime > 180 * 1000) {
        setIsTimeout(true);
        return false;
      }

      if (status === 'PENDING' || status === 'PROCESSING') {
        return 2500; // Poll every 2.5 seconds
      }

      return false; // Stop polling
    },
    // Reset timer when fileId changes
    gcTime: 0,
  });

  // Reset timeout state if fileId updates
  useEffect(() => {
    setPollStartTime(null);
    setIsTimeout(false);
  }, [fileId]);

  const reindexMutation = useMutation({
    mutationFn: () => ocrService.reindex(fileId),
    onSuccess: () => {
      toast.success('OCR re-indexing queued successfully');
      setPollStartTime(Date.now());
      setIsTimeout(false);
      queryClient.invalidateQueries({ queryKey: ['ocr-status', fileId] });
      queryClient.invalidateQueries({ queryKey: ['file-preview', fileId] });
    },
    onError: () => {
      toast.error('Failed to trigger OCR re-indexing');
    },
  });

  const status = isTimeout ? 'FAILED' : (data?.status || 'NONE');

  return {
    status,
    isTimeout,
    isLoading,
    error,
    reindex: reindexMutation.mutate,
    isReindexing: reindexMutation.isPending,
  };
}
