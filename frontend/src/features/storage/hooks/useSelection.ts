import { useState, useCallback } from 'react';

export function useSelection<T extends { id: number }>() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const isSelected = useCallback((id: number) => selectedIds.has(id), [selectedIds]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectSingle = useCallback((id: number) => {
    setSelectedIds(new Set([id]));
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback((items: T[]) => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) {
        return new Set();
      } else {
        return new Set(items.map((item) => item.id));
      }
    });
  }, []);

  return {
    selectedIds,
    isSelected,
    toggleSelect,
    selectSingle,
    selectAll,
    clearSelection,
    toggleSelectAll,
  };
}
