import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchService } from '../services/search.service';

export function useSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // Query: Suggestions
  const { data: suggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['search-suggestions'],
    queryFn: searchService.getSuggestions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query: Recent searches
  const { data: recentSearches = [], refetch: refetchRecent } = useQuery({
    queryKey: ['search-recent'],
    queryFn: searchService.getRecent,
  });

  // Mutation: Clear history
  const clearHistoryMutation = useMutation({
    mutationFn: searchService.clearRecent,
    onSuccess: () => {
      queryClient.setQueryData(['search-recent'], []);
    },
  });

  return {
    query,
    setQuery,
    debouncedQuery,
    suggestions,
    isLoadingSuggestions,
    recentSearches,
    refetchRecent,
    clearHistory: clearHistoryMutation.mutate,
    isClearingHistory: clearHistoryMutation.isPending,
  };
}
