/**
 * Performance Optimization Hooks
 * Provides React.memo, useMemo, useCallback optimizations and performance monitoring
 */

import {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
  type DependencyList,
  type MutableRefObject,
} from 'react';
import { logger } from '@/utils/logger';
import { performanceService } from '@/services/performanceService';

/**
 * Enhanced useCallback with performance monitoring
 */
export function useOptimizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: DependencyList,
  debugName?: string
): T {
  const renderCountRef = useRef(0);
  const lastDepsRef = useRef<DependencyList | undefined>(undefined);

  // Track callback recreation
  useEffect(() => {
    renderCountRef.current++;

    if (debugName && renderCountRef.current > 1) {
      const depsChanged =
        !lastDepsRef.current ||
        deps.some((dep, index) => dep !== lastDepsRef.current![index]);

      if (depsChanged) {
        logger.debug('Callback recreated', {
          name: debugName,
          renderCount: renderCountRef.current,
          depsChanged,
        });
      }
    }

    lastDepsRef.current = deps;
  });

  return useCallback(callback, deps);
}

/**
 * Enhanced useMemo with performance monitoring
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: DependencyList,
  debugName?: string
): T {
  const renderCountRef = useRef(0);
  const lastDepsRef = useRef<DependencyList | undefined>(undefined);
  const computeTimeRef = useRef(0);

  const result = useMemo(() => {
    const startTime = performance.now();
    const value = factory();
    const computeTime = performance.now() - startTime;

    computeTimeRef.current = computeTime;
    renderCountRef.current++;

    if (debugName) {
      const depsChanged =
        !lastDepsRef.current ||
        deps.some((dep, index) => dep !== lastDepsRef.current![index]);

      logger.debug('Memo computed', {
        name: debugName,
        renderCount: renderCountRef.current,
        computeTime: Math.round(computeTime),
        depsChanged,
      });

      // Record performance metric if computation is expensive
      if (computeTime > 16) {
        // More than one frame
        performanceService.recordRenderTime(debugName, computeTime);
      }
    }

    lastDepsRef.current = deps;
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factory, debugName, ...deps]);

  return result;
}

/**
 * Hook for debouncing values to prevent excessive re-renders
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>): ReturnType<T> => {
      const now = Date.now();

      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args) as ReturnType<T>;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(
          () => {
            lastCallRef.current = Date.now();
            callback(...args);
          },
          delay - (now - lastCallRef.current)
        );

        // Return undefined for throttled calls (this is expected behavior)
        return undefined as ReturnType<T>;
      }
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string): {
  renderTime: number;
  renderCount: number;
  averageRenderTime: number;
} {
  const renderCountRef = useRef(0);
  const totalRenderTimeRef = useRef(0);
  const [renderTime, setRenderTime] = useState(0);
  const startTimeRef = useRef<number>(0);

  // Mark render start
  useEffect(() => {
    startTimeRef.current = performance.now();
  });

  // Mark render end
  useEffect(() => {
    const endTime = performance.now();
    const currentRenderTime = endTime - startTimeRef.current;

    renderCountRef.current++;
    totalRenderTimeRef.current += currentRenderTime;
    setRenderTime(currentRenderTime);

    // Log slow renders
    if (currentRenderTime > 16) {
      logger.warn('Slow render detected', {
        component: componentName,
        renderTime: Math.round(currentRenderTime),
        renderCount: renderCountRef.current,
      });
    }

    // Record performance metric
    performanceService.recordRenderTime(componentName, currentRenderTime);
  }, [componentName]);

  const averageRenderTime =
    renderCountRef.current > 0
      ? totalRenderTimeRef.current / renderCountRef.current
      : 0;

  return {
    renderTime: Math.round(renderTime),
    renderCount: renderCountRef.current,
    averageRenderTime: Math.round(averageRenderTime),
  };
}

/**
 * Hook for preventing unnecessary re-renders with deep comparison
 */
export function useDeepMemo<T>(value: T): T {
  const ref = useRef<T>(value);
  const [, forceUpdate] = useState({});

  if (!deepEqual(ref.current, value)) {
    ref.current = value;
    forceUpdate({});
  }

  return ref.current;
}

/**
 * Deep equality check for objects and arrays
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(objA[key], objB[key]));
  }

  return false;
}

/**
 * Hook for lazy initialization of expensive computations
 */
export function useLazyRef<T>(init: () => T): MutableRefObject<T> {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = init();
  }

  return ref as MutableRefObject<T>;
}

/**
 * Hook for batching state updates to prevent excessive re-renders
 */
export function useBatchedState<T>(
  initialState: T,
  batchDelay: number = 16
): [T, (updater: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Array<T | ((prev: T) => T)>>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchedSetState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      pendingUpdatesRef.current.push(updater);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setState(prevState => {
          let newState = prevState;

          for (const update of pendingUpdatesRef.current) {
            newState =
              typeof update === 'function'
                ? (update as (prev: T) => T)(newState)
                : update;
          }

          pendingUpdatesRef.current = [];
          return newState;
        });
      }, batchDelay);
    },
    [batchDelay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchedSetState];
}

/**
 * Hook for intersection observer with performance optimization
 */
export function useOptimizedIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement | null>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Reuse observer if options haven't changed
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsIntersecting(entry.isIntersecting);
        },
        {
          threshold: 0.1,
          rootMargin: '50px',
          ...options,
        }
      );
    }

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
    };
  }, [options]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [ref, isIntersecting];
}

/**
 * Hook for memory usage monitoring
 */
export function useMemoryMonitoring(componentName: string): {
  memoryUsage: number;
  isMemoryHigh: boolean;
} {
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [isMemoryHigh, setIsMemoryHigh] = useState(false);

  const checkMemory = useCallback((): void => {
    if ('memory' in performance) {
      const memory = (
        performance as {
          memory: { usedJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      const usage = memory.usedJSHeapSize;
      const limit = memory.jsHeapSizeLimit;

      setMemoryUsage(usage);
      setIsMemoryHigh(usage / limit > 0.8); // 80% threshold

      // Record performance metric
      performanceService.recordMetric('memoryUsage', usage);

      if (usage / limit > 0.9) {
        logger.warn('High memory usage detected', {
          component: componentName,
          usage: Math.round(usage / 1024 / 1024), // MB
          limit: Math.round(limit / 1024 / 1024), // MB
          percentage: Math.round((usage / limit) * 100),
        });
      }
    }
  }, [componentName]);

  useEffect(() => {
    // Check memory usage periodically
    const interval = setInterval(checkMemory, 5000); // Every 5 seconds
    checkMemory(); // Initial check

    return () => {
      clearInterval(interval);
    };
  }, [checkMemory]);

  return { memoryUsage, isMemoryHigh };
}

/**
 * Hook for preventing memory leaks in async operations
 */
export function useAsyncSafeState<T>(
  initialState: T
): [T, (newState: T) => void] {
  const [state, setState] = useState<T>(initialState);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((newState: T) => {
    if (isMountedRef.current) {
      setState(newState);
    }
  }, []);

  return [state, safeSetState];
}

/**
 * Hook for component update optimization
 */
export function useUpdateOptimization(
  deps: DependencyList,
  debugName?: string
): boolean {
  const renderCountRef = useRef(0);
  const lastDepsRef = useRef<DependencyList | undefined>(undefined);
  const [shouldUpdate, setShouldUpdate] = useState(true);

  useEffect(() => {
    renderCountRef.current++;

    const depsChanged =
      !lastDepsRef.current ||
      deps.some((dep, index) => dep !== lastDepsRef.current![index]);

    setShouldUpdate(depsChanged);

    if (debugName && !depsChanged && renderCountRef.current > 1) {
      logger.debug('Unnecessary render prevented', {
        component: debugName,
        renderCount: renderCountRef.current,
      });
    }

    lastDepsRef.current = deps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugName, ...deps]);

  return shouldUpdate;
}
