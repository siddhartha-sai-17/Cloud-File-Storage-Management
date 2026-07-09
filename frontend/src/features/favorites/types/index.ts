import type { StorageItem } from '@/features/storage/types';

export interface FavoriteStats {
  totalCount: number;
  totalSizeBytes: number;
  categoryCounts: Record<string, number>;
}

export type FavoritesPageResponse = {
  content: StorageItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};
