export interface SearchRequestDto {
  query: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean>;
}

export interface SearchResultDto {
  fileId?: number; // Nullable for non-file entities
  filename?: string; // Nullable for non-file entities
  owner?: string; // Nullable
  folder?: string; // Nullable
  category?: string; // Nullable
  score: number; // Required
  matchedFields?: string[]; // Nullable
  snippet?: string; // Nullable
  highlights?: string[]; // Nullable
  entityType: 'FILE' | 'COMMENT' | 'AUDIT'; // Required
  entityId: number; // Required
  title?: string; // Nullable
}

export interface SearchSuggestionDto {
  recentQueries: string[];
  popularTags: string[];
  categories: string[];
  owners: string[];
}
