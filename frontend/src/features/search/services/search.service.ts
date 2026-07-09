import { apiClient } from '@/api/axios';
import { type SearchRequestDto, type SearchResultDto, type SearchSuggestionDto } from '../types';
import { type PageResponse } from '../../storage/types';

export const searchService = {
  search: async (request: SearchRequestDto): Promise<PageResponse<SearchResultDto>> => {
    const response = await apiClient.post<PageResponse<SearchResultDto>>('/api/search', request);
    return response.data;
  },

  getSuggestions: async (): Promise<SearchSuggestionDto> => {
    const response = await apiClient.get<SearchSuggestionDto>('/api/search/suggestions');
    return response.data;
  },

  getRecent: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/api/search/recent');
    return response.data;
  },

  clearRecent: async (): Promise<void> => {
    await apiClient.delete('/api/search/recent');
  },

  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/api/search/categories');
    return response.data;
  },
};
