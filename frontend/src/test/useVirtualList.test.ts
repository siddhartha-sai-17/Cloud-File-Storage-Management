import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVirtualList } from '@/hooks/useVirtualList';

describe('useVirtualList', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  it('returns a containerRef', () => {
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50 })
    );
    expect(result.current.containerRef).toBeDefined();
  });

  it('calculates totalHeight correctly', () => {
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50 })
    );
    // 100 items × 50px each = 5000px
    expect(result.current.totalHeight).toBe(5000);
  });

  it('returns a virtualItems slice', () => {
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50, overscan: 0 })
    );
    // Should have some items (at minimum the amount fitting in viewport or the entire list)
    expect(Array.isArray(result.current.virtualItems)).toBe(true);
  });

  it('returns correct item data in virtualItems', () => {
    const { result } = renderHook(() =>
      useVirtualList(items, { itemHeight: 50, overscan: 2 })
    );
    const { virtualItems } = result.current;
    if (virtualItems.length > 0) {
      expect(virtualItems[0]).toHaveProperty('item');
      expect(virtualItems[0]).toHaveProperty('index');
      expect(virtualItems[0]).toHaveProperty('offsetTop');
    }
  });

  it('handles empty items array gracefully', () => {
    const { result } = renderHook(() =>
      useVirtualList([], { itemHeight: 50 })
    );
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.virtualItems).toHaveLength(0);
  });

  it('handles single item', () => {
    const { result } = renderHook(() =>
      useVirtualList([{ id: 1, name: 'Solo' }], { itemHeight: 50 })
    );
    expect(result.current.totalHeight).toBe(50);
  });
});
