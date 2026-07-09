import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Your internet connection has been restored. Syncing data...');
      logger.info('App went ONLINE, triggering local query client sync', 'OfflineSync');

      // Refetch all active queries to sync with the backend database
      queryClient.refetchQueries({ stale: true });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are currently offline. Using cached offline workspace records.');
      logger.warn('App went OFFLINE. Offline fallback indicators activated.', 'OfflineSync');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  return {
    isOnline,
    showOfflineState: !isOnline,
  };
}

export default useOffline;
