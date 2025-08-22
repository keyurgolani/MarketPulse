/**
 * Virtualization Utilities
 * Provides virtual scrolling, windowing, and infinite scrolling for large datasets
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { logger } from './logger';

export interface VirtualScrollOptions {
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  scrollingDelay?: number;
  getScrollElement?: () => HTMLElement | null;
}

export interface VirtualScrollState {
  scrollTop: number;
  isScrolling: boolean;
  visibleStartIndex: number;
  visibleStopIndex: number;
}

export interface InfiniteScrollOptions {
  threshold?: number;
  hasNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loadingComponent?: React.ComponentType;
}

export interface WindowedListProps<T> {
  items: T[];
  itemHeight: number | ((index: number, item: T) => number);
  containerHeight: number;
  renderItem: (props: {
    index: number;
    item: T;
    style: React.CSSProperties;
  }) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

/**
 * Hook for virtual scrolling
 */
export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): {
  virtualItems: Array<{
    index: number;
    item: T;
    offsetTop: number;
    height: number;
  }>;
  totalHeight: number;
  scrollElementProps: {
    onScroll: (event: React.UIEvent<HTMLElement>) => void;
    style: React.CSSProperties;
  };
  state: VirtualScrollState;
} {
  const {
    itemHeight,
    containerHeight,
    overscan = 5,
    scrollingDelay = 150,
  } = options;

  const [state, setState] = useState<VirtualScrollState>({
    scrollTop: 0,
    isScrolling: false,
    visibleStartIndex: 0,
    visibleStopIndex: 0,
  });

  const scrollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate item heights and positions
  const itemMetadata = useMemo(() => {
    const metadata: Array<{ offsetTop: number; height: number }> = [];
    let offsetTop = 0;

    for (let i = 0; i < items.length; i++) {
      const height =
        typeof itemHeight === 'function' ? itemHeight(i) : itemHeight;
      metadata.push({ offsetTop, height });
      offsetTop += height;
    }

    return metadata;
  }, [items.length, itemHeight]);

  const totalHeight = useMemo(() => {
    return itemMetadata.length > 0
      ? itemMetadata[itemMetadata.length - 1].offsetTop +
          itemMetadata[itemMetadata.length - 1].height
      : 0;
  }, [itemMetadata]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (itemMetadata.length === 0) {
      return { startIndex: 0, stopIndex: 0 };
    }

    const { scrollTop } = state;
    const viewportBottom = scrollTop + containerHeight;

    // Binary search for start index
    let startIndex = 0;
    let endIndex = itemMetadata.length - 1;

    while (startIndex <= endIndex) {
      const middleIndex = Math.floor((startIndex + endIndex) / 2);
      const { offsetTop, height } = itemMetadata[middleIndex];

      if (offsetTop + height <= scrollTop) {
        startIndex = middleIndex + 1;
      } else if (offsetTop > scrollTop) {
        endIndex = middleIndex - 1;
      } else {
        startIndex = middleIndex;
        break;
      }
    }

    // Find stop index
    let stopIndex = startIndex;
    while (
      stopIndex < itemMetadata.length &&
      itemMetadata[stopIndex].offsetTop < viewportBottom
    ) {
      stopIndex++;
    }

    // Apply overscan
    const overscanStartIndex = Math.max(0, startIndex - overscan);
    const overscanStopIndex = Math.min(
      itemMetadata.length - 1,
      stopIndex + overscan
    );

    return {
      startIndex: overscanStartIndex,
      stopIndex: overscanStopIndex,
    };
  }, [state.scrollTop, containerHeight, itemMetadata, overscan]);

  // Update visible range in state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      visibleStartIndex: visibleRange.startIndex,
      visibleStopIndex: visibleRange.stopIndex,
    }));
  }, [visibleRange]);

  // Handle scroll
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      const scrollTop = event.currentTarget.scrollTop;

      setState(prev => ({
        ...prev,
        scrollTop,
        isScrolling: true,
      }));

      // Clear existing timeout
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }

      // Set scrolling to false after delay
      scrollingTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isScrolling: false,
        }));
      }, scrollingDelay);
    },
    [scrollingDelay]
  );

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const items_: Array<{
      index: number;
      item: T;
      offsetTop: number;
      height: number;
    }> = [];

    for (let i = visibleRange.startIndex; i <= visibleRange.stopIndex; i++) {
      if (i < items.length && itemMetadata[i]) {
        items_.push({
          index: i,
          item: items[i],
          offsetTop: itemMetadata[i].offsetTop,
          height: itemMetadata[i].height,
        });
      }
    }

    return items_;
  }, [items, itemMetadata, visibleRange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    virtualItems,
    totalHeight,
    scrollElementProps: {
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflow: 'auto',
      },
    },
    state,
  };
}

/**
 * Windowed List Component
 */
export function WindowedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
}: WindowedListProps<T>): React.JSX.Element {
  const { virtualItems, totalHeight, scrollElementProps } = useVirtualScroll(
    items,
    {
      itemHeight:
        typeof itemHeight === 'function'
          ? (index: number) => itemHeight(index, items[index])
          : itemHeight,
      containerHeight,
      overscan,
    }
  );

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      scrollElementProps.onScroll(event);
      onScroll?.(event.currentTarget.scrollTop);
    },
    [scrollElementProps.onScroll, onScroll]
  );

  return (
    <div
      className={`relative ${className}`}
      style={scrollElementProps.style}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ index, item, offsetTop, height }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetTop,
              left: 0,
              right: 0,
              height,
            }}
          >
            {renderItem({
              index,
              item,
              style: { height },
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook for infinite scrolling
 */
export function useInfiniteScroll(options: InfiniteScrollOptions): {
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  isNearEnd: boolean;
} {
  const { threshold = 100, hasNextPage, isLoading, onLoadMore } = options;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [isNearEnd, setIsNearEnd] = useState(false);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setIsNearEnd(isIntersecting);

        if (isIntersecting && hasNextPage && !isLoading) {
          logger.debug('Loading more items via intersection observer');
          onLoadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0.1,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, hasNextPage, isLoading, onLoadMore]);

  return {
    loadMoreRef,
    isNearEnd,
  };
}

/**
 * Infinite Scroll Component
 */
export function InfiniteScrollContainer({
  children,
  options,
  className = '',
}: {
  children: React.ReactNode;
  options: InfiniteScrollOptions;
  className?: string;
}): React.JSX.Element {
  const { loadMoreRef } = useInfiniteScroll(options);
  const {
    isLoading,
    hasNextPage,
    loadingComponent: LoadingComponent,
  } = options;

  return (
    <div className={className}>
      {children}

      {hasNextPage && (
        <div ref={loadMoreRef} className="h-4">
          {isLoading && LoadingComponent && <LoadingComponent />}
          {isLoading && !LoadingComponent && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      )}

      {!hasNextPage && (
        <div className="text-center py-4 text-gray-500">
          No more items to load
        </div>
      )}
    </div>
  );
}

/**
 * Virtual Table Component for large datasets
 */
export interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: string;
    header: string;
    width: number;
    render?: (item: T, index: number) => React.ReactNode;
  }>;
  rowHeight: number;
  containerHeight: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight,
  containerHeight,
  className = '',
  onRowClick,
}: VirtualTableProps<T>): React.JSX.Element {
  const { virtualItems, totalHeight, scrollElementProps } = useVirtualScroll(
    data,
    {
      itemHeight: rowHeight,
      containerHeight: containerHeight - 40, // Account for header
      overscan: 5,
    }
  );

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  return (
    <div
      className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div
        className="bg-gray-50 border-b border-gray-200 flex"
        style={{ width: totalWidth }}
      >
        {columns.map(column => (
          <div
            key={column.key}
            className="px-4 py-2 font-medium text-gray-900 border-r border-gray-200 last:border-r-0"
            style={{ width: column.width, minWidth: column.width }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual Rows */}
      <div
        style={{
          ...scrollElementProps.style,
          height: containerHeight - 40,
        }}
        onScroll={scrollElementProps.onScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {virtualItems.map(({ index, item, offsetTop }) => (
            <div
              key={index}
              className={`absolute left-0 right-0 flex border-b border-gray-100 hover:bg-gray-50 ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
              style={{
                top: offsetTop,
                height: rowHeight,
                width: totalWidth,
              }}
              onClick={() => onRowClick?.(item, index)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick?.(item, index);
                }
              }}
              tabIndex={onRowClick ? 0 : -1}
              role={onRowClick ? 'button' : undefined}
            >
              {columns.map(column => (
                <div
                  key={column.key}
                  className="px-4 py-2 border-r border-gray-100 last:border-r-0 flex items-center"
                  style={{ width: column.width, minWidth: column.width }}
                >
                  {column.render
                    ? column.render(item, index)
                    : String(
                        (item as Record<string, unknown>)[column.key] || ''
                      )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Performance monitoring for virtualization
 */
export function useVirtualizationPerformance(
  itemCount: number,
  visibleCount: number
): {
  renderRatio: number;
  memoryUsage: number;
  scrollPerformance: number;
} {
  const [metrics, setMetrics] = useState({
    renderRatio: 0,
    memoryUsage: 0,
    scrollPerformance: 0,
  });

  useEffect(() => {
    const renderRatio = itemCount > 0 ? visibleCount / itemCount : 0;

    // Estimate memory usage (rough calculation)
    const memoryUsage = visibleCount * 100; // Assume 100 bytes per visible item

    setMetrics({
      renderRatio,
      memoryUsage,
      scrollPerformance: 0, // Simplified - no scroll performance tracking
    });
  }, [itemCount, visibleCount]);

  return metrics;
}

/**
 * Pagination optimization for large datasets
 */
export interface PaginationOptions {
  pageSize: number;
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  prefetchPages?: number;
}

export function usePaginationOptimization(options: PaginationOptions): {
  visiblePages: number[];
  prefetchedPages: Set<number>;
  isPageLoading: (page: number) => boolean;
  prefetchPage: (page: number) => void;
} {
  const { pageSize, currentPage, totalItems, prefetchPages = 2 } = options;

  const [prefetchedPages, setPrefetchedPages] = useState<Set<number>>(
    new Set()
  );
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());

  const totalPages = Math.ceil(totalItems / pageSize);

  // Calculate visible page numbers
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }, [currentPage, totalPages]);

  // Prefetch adjacent pages
  useEffect(() => {
    const pagesToPrefetch: number[] = [];

    for (let i = 1; i <= prefetchPages; i++) {
      if (currentPage + i <= totalPages) {
        pagesToPrefetch.push(currentPage + i);
      }
      if (currentPage - i >= 1) {
        pagesToPrefetch.push(currentPage - i);
      }
    }

    pagesToPrefetch.forEach(page => {
      if (!prefetchedPages.has(page) && !loadingPages.has(page)) {
        prefetchPage(page);
      }
    });
  }, [currentPage, totalPages, prefetchPages, prefetchedPages, loadingPages]);

  const prefetchPage = useCallback((page: number) => {
    setLoadingPages(prev => new Set(prev).add(page));

    // Simulate page loading (replace with actual data fetching)
    setTimeout(() => {
      setPrefetchedPages(prev => new Set(prev).add(page));
      setLoadingPages(prev => {
        const newSet = new Set(prev);
        newSet.delete(page);
        return newSet;
      });

      logger.debug('Page prefetched', { page });
    }, 100);
  }, []);

  const isPageLoading = useCallback(
    (page: number) => {
      return loadingPages.has(page);
    },
    [loadingPages]
  );

  return {
    visiblePages,
    prefetchedPages,
    isPageLoading,
    prefetchPage,
  };
}
