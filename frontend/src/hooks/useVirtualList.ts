import { useState, useEffect, useRef, useMemo, type RefObject } from 'react';

interface UseVirtualListOptions {
  itemHeight: number;
  overscan?: number;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  offsetTop: number;
}

/**
 * A highly robust, dependency-free React hook for list virtualization.
 * Works by measuring scroll container bounds and calculating visible index offsets.
 */
export function useVirtualList<T>(
  items: T[],
  options: UseVirtualListOptions
) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const { itemHeight, overscan = 5 } = options;

  // Handle scroll measurement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set initial dimensions
    setScrollTop(container.scrollTop);
    setContainerHeight(container.clientHeight);

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    // ResizeObserver for dynamic scaling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height || container.clientHeight);
      }
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [items]); // Re-attach when list ref or item size changes

  // Compute sliced virtual elements
  const { virtualItems, totalHeight } = useMemo(() => {
    const totalCount = items.length;
    const totalHeight = totalCount * itemHeight;

    // Calculate start and end indices matching viewport
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalCount - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const virtualItems: VirtualItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        item: items[i],
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return { virtualItems, totalHeight };
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  return {
    containerRef: containerRef as unknown as RefObject<any>,
    virtualItems,
    totalHeight,
  };
}

export default useVirtualList;
