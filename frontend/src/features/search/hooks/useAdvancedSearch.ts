import { useState, useCallback } from 'react';

export interface AdvancedFilters {
  extension?: string;
  size?: 'small' | 'medium' | 'large' | 'huge' | '';
  dateRange?: 'today' | 'week' | 'month' | 'year' | '';
  owner?: string;
  category?: string;
  starred?: boolean;
}

export function useAdvancedSearch() {
  const [filters, setFilters] = useState<AdvancedFilters>({
    extension: '',
    size: '',
    dateRange: '',
    owner: '',
    category: '',
    starred: false,
  });

  const resetFilters = useCallback(() => {
    setFilters({
      extension: '',
      size: '',
      dateRange: '',
      owner: '',
      category: '',
      starred: false,
    });
  }, []);

  const updateFilters = useCallback((updates: Partial<AdvancedFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  // Build Google Drive-style AST query prefix matching Spring spec
  const buildQueryWithFilters = useCallback((baseText: string) => {
    const tokens: string[] = [];

    if (baseText.trim()) {
      tokens.push(baseText.trim());
    }

    if (filters.extension) {
      tokens.push(`extension:${filters.extension}`);
    }

    if (filters.category) {
      tokens.push(`category:${filters.category}`);
    }

    if (filters.owner) {
      tokens.push(`owner:${filters.owner}`);
    }

    if (filters.starred) {
      tokens.push('starred:true');
    }

    if (filters.size) {
      // Small: < 1MB, Medium: 1-10MB, Large: 10-100MB, Huge: > 100MB
      switch (filters.size) {
        case 'small':
          tokens.push('size<1048576');
          break;
        case 'medium':
          tokens.push('size>=1048576 size<10485760');
          break;
        case 'large':
          tokens.push('size>=10485760 size<104857600');
          break;
        case 'huge':
          tokens.push('size>=104857600');
          break;
      }
    }

    if (filters.dateRange) {
      const today = new Date();
      let limitDate: Date;

      switch (filters.dateRange) {
        case 'today':
          limitDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case 'week':
          limitDate = new Date(today.setDate(today.getDate() - 7));
          break;
        case 'month':
          limitDate = new Date(today.setMonth(today.getMonth() - 1));
          break;
        case 'year':
          limitDate = new Date(today.setFullYear(today.getFullYear() - 1));
          break;
      }

      if (limitDate) {
        // Mapped to ISO date format: YYYY-MM-DD
        const dateStr = limitDate.toISOString().split('T')[0];
        tokens.push(`date>${dateStr}`);
      }
    }

    return tokens.join(' ');
  }, [filters]);

  return {
    filters,
    updateFilters,
    resetFilters,
    buildQueryWithFilters,
  };
}
