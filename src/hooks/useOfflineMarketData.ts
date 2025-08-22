import { useEffect, useState, useCallback, useRef } from 'react';
import { useMarketDataStream } from './useMarketDataStream';
import { offlineService } from '../services/offlineService';
import type { NetworkStatus } from '../services/offlineService';
import type { PriceUpdate } from './useMarketDataStream';
import { logger } from '../utils/logger';

export interface OfflineMarketDataOptions {
  symbols: string[];
  userId?: string;
  enableOfflineMode?: boolean;
  cacheTimeout?: number; // How long to keep cached data (ms)
  onNetworkStatusChange?: (status: NetworkStatus) => void;
  onOfflineModeChange?: (isOffline: boolean) => void;
}

export interface UseOfflineMarketDataReturn {
  // Market data stream properties
  isSubscribed: boolean;
  isConnected: boolean;
  latestPrices: Map<string, PriceUpdate>;

  // Offline-specific properties
  isOffline: boolean;
  networkStatus: NetworkStatus;
  cachedPrices: Map<string, PriceUpdate>;
  queuedActions: number;

  // Actions
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols?: string[]) => void;
  refreshData: () => void;
  clearCache: () => void;

  // Status
  error: Error | null;
  lastUpdate: number;
}

export function useOfflineMarketData(
  options: OfflineMarketDataOptions
): UseOfflineMarketDataReturn {
  const {
    symbols,
    userId = 'anonymous',
    enableOfflineMode = true,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes default
    onNetworkStatusChange,
    onOfflineModeChange,
  } = options;

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    offlineService.getNetworkStatus()
  );
  const [cachedPrices, setCachedPrices] = useState<Map<string, PriceUpdate>>(
    new Map()
  );
  const [queuedActions, setQueuedActions] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);

  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSubscriptions = useRef<Set<string>>(new Set());

  // Market data stream hook
  const {
    isSubscribed,
    isConnected,
    latestPrices,
    subscribe: streamSubscribe,
    unsubscribe: streamUnsubscribe,
    error,
  } = useMarketDataStream({
    symbols: networkStatus.isOnline ? symbols : [],
    userId,
    autoSubscribe: networkStatus.isOnline,
    onPriceUpdate: (update: PriceUpdate) => {
      // Update cache with new data
      setCachedPrices(prev => {
        const newMap = new Map(prev);
        newMap.set(update.symbol, update);
        return newMap;
      });

      setLastUpdate(Date.now());

      // Clear old cache entries
      clearExpiredCache();
    },
  });

  const isOffline = !networkStatus.isOnline;

  // Process queued subscriptions when connection is restored
  const processQueuedSubscriptions = useCallback((): void => {
    if (pendingSubscriptions.current.size > 0) {
      const symbolsToSubscribe = Array.from(pendingSubscriptions.current);
      logger.info('Processing pending subscriptions:', {
        symbols: symbolsToSubscribe,
      });

      streamSubscribe(symbolsToSubscribe);
      pendingSubscriptions.current.clear();
    }
  }, [streamSubscribe]);

  // Network status listener
  useEffect(() => {
    const handleNetworkChange = (status: NetworkStatus): void => {
      logger.info('Network status changed:', { status });
      setNetworkStatus(status);
      onNetworkStatusChange?.(status);

      if (status.isOnline) {
        // Connection restored
        logger.info('Connection restored, processing queued actions');
        processQueuedSubscriptions();
      } else {
        // Connection lost
        logger.warn('Connection lost, entering offline mode');
      }

      onOfflineModeChange?.(!status.isOnline);
    };

    offlineService.addListener(handleNetworkChange);

    return (): void => {
      offlineService.removeListener(handleNetworkChange);
    };
  }, [onNetworkStatusChange, onOfflineModeChange, processQueuedSubscriptions]);

  // Update queued actions count
  useEffect(() => {
    const updateQueueCount = (): void => {
      const stats = offlineService.getQueueStats();
      setQueuedActions(stats.totalItems);
    };

    // Update initially
    updateQueueCount();

    // Update periodically
    const interval = setInterval(updateQueueCount, 5000);

    return (): void => clearInterval(interval);
  }, []);

  // Handle offline queue processing
  useEffect(() => {
    const handleQueueProcess = (event: CustomEvent): void => {
      const item = event.detail;

      if (item.type === 'subscription' && networkStatus.isOnline) {
        const { symbols: queuedSymbols } = item.data as { symbols: string[] };
        logger.info('Processing queued subscription:', {
          symbols: queuedSymbols,
        });
        streamSubscribe(queuedSymbols);
      } else if (item.type === 'unsubscription' && networkStatus.isOnline) {
        const { symbols: queuedSymbols } = item.data as { symbols?: string[] };
        logger.info('Processing queued unsubscription:', {
          symbols: queuedSymbols,
        });
        streamUnsubscribe(queuedSymbols);
      }
    };

    window.addEventListener(
      'offline-queue-process',
      handleQueueProcess as EventListener
    );

    return (): void => {
      window.removeEventListener(
        'offline-queue-process',
        handleQueueProcess as EventListener
      );
    };
  }, [networkStatus.isOnline, streamSubscribe, streamUnsubscribe]);

  // Clear expired cache entries
  const clearExpiredCache = useCallback((): void => {
    if (!enableOfflineMode) return;

    const now = Date.now();
    setCachedPrices(prev => {
      const newMap = new Map(prev);
      let removedCount = 0;

      for (const [symbol, update] of newMap.entries()) {
        if (now - update.timestamp > cacheTimeout) {
          newMap.delete(symbol);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        logger.debug(`Cleared ${removedCount} expired cache entries`);
      }

      return newMap;
    });
  }, [enableOfflineMode, cacheTimeout]);

  // Subscribe function with offline handling
  const subscribe = useCallback(
    (symbolsToSubscribe: string[]): void => {
      if (networkStatus.isOnline) {
        streamSubscribe(symbolsToSubscribe);
      } else if (enableOfflineMode) {
        // Queue subscription for when connection is restored
        symbolsToSubscribe.forEach(symbol => {
          pendingSubscriptions.current.add(symbol);
        });

        offlineService.queueOfflineAction('subscription', {
          symbols: symbolsToSubscribe,
          userId,
        });

        logger.info('Queued subscription for offline processing:', {
          symbols: symbolsToSubscribe,
        });
      }
    },
    [networkStatus.isOnline, enableOfflineMode, streamSubscribe, userId]
  );

  // Unsubscribe function with offline handling
  const unsubscribe = useCallback(
    (symbolsToUnsubscribe?: string[]): void => {
      if (networkStatus.isOnline) {
        streamUnsubscribe(symbolsToUnsubscribe);
      } else if (enableOfflineMode) {
        // Queue unsubscription for when connection is restored
        if (symbolsToUnsubscribe) {
          symbolsToUnsubscribe.forEach(symbol => {
            pendingSubscriptions.current.delete(symbol);
          });
        } else {
          pendingSubscriptions.current.clear();
        }

        offlineService.queueOfflineAction('unsubscription', {
          symbols: symbolsToUnsubscribe,
          userId,
        });

        logger.info('Queued unsubscription for offline processing:', {
          symbols: symbolsToUnsubscribe,
        });
      }
    },
    [networkStatus.isOnline, enableOfflineMode, streamUnsubscribe, userId]
  );

  // Refresh data function
  const refreshData = useCallback((): void => {
    if (networkStatus.isOnline) {
      // Re-subscribe to current symbols to get fresh data
      if (symbols.length > 0) {
        streamSubscribe(symbols);
      }
    } else {
      logger.warn('Cannot refresh data while offline');
    }
  }, [networkStatus.isOnline, symbols, streamSubscribe]);

  // Clear cache function
  const clearCache = useCallback((): void => {
    setCachedPrices(new Map());
    logger.info('Market data cache cleared');
  }, []);

  // Set up cache cleanup interval
  useEffect(() => {
    if (enableOfflineMode) {
      cacheTimeoutRef.current = setInterval(clearExpiredCache, 60000); // Check every minute
    }

    return (): void => {
      if (cacheTimeoutRef.current) {
        clearInterval(cacheTimeoutRef.current);
      }
    };
  }, [enableOfflineMode, clearExpiredCache]);

  // Get effective prices (live data when online, cached when offline)
  const effectivePrices = networkStatus.isOnline ? latestPrices : cachedPrices;

  return {
    // Market data stream properties
    isSubscribed: networkStatus.isOnline
      ? isSubscribed
      : pendingSubscriptions.current.size > 0,
    isConnected: networkStatus.isOnline && isConnected,
    latestPrices: effectivePrices,

    // Offline-specific properties
    isOffline,
    networkStatus,
    cachedPrices,
    queuedActions,

    // Actions
    subscribe,
    unsubscribe,
    refreshData,
    clearCache,

    // Status
    error: networkStatus.isOnline ? error : null,
    lastUpdate,
  };
}
