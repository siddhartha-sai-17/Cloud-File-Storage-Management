import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteService } from '../services/favorite.service';
import { toast } from 'sonner';

export function useFavorites(page = 0, size = 20) {
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites', page, size],
    queryFn: () => favoriteService.listFavorites(page, size),
  });

  const statsQuery = useQuery({
    queryKey: ['favorite-stats'],
    queryFn: () => favoriteService.getStats(),
  });

  const starMutation = useMutation({
    mutationFn: (fileId: number) => favoriteService.starFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-stats'] });
      queryClient.invalidateQueries({ queryKey: ['storage-items'] });
      toast.success('Starred successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to star file');
    },
  });

  const unstarMutation = useMutation({
    mutationFn: (fileId: number) => favoriteService.unstarFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-stats'] });
      queryClient.invalidateQueries({ queryKey: ['storage-items'] });
      toast.success('Unstarred successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to unstar file');
    },
  });

  return {
    favorites: favoritesQuery.data?.content || [],
    totalElements: favoritesQuery.data?.totalElements || 0,
    totalPages: favoritesQuery.data?.totalPages || 0,
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    star: starMutation.mutateAsync,
    unstar: unstarMutation.mutateAsync,
    refetch: favoritesQuery.refetch,
  };
}
