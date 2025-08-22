import { useEffect, useRef, useCallback, useState } from 'react';
import { webSocketService } from '../services/webSocketService';
// Market data streaming hook for real-time price updates
import { logger } from '../utils/logger';

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  source: string;
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: number;
  nextClose?: number;
  timezone: string;
  timestamp: number;
}

export interface MarketDataSubscription {
  subscriptionId: string;
  symbols: string[];
  createdAt: number;
  lastUpdate: number;
}

export interface UseMarketDataStreamOptions {
  symbols?: string[];
  userId?: string;
  autoSubscribe?: boolean;
  onPriceUpdate?: (update: PriceUpdate) => void;
  onMarketStatus?: (status: MarketStatus) => void;
  onSubscriptionChange?: (subscription: MarketDataSubscription | null) => void;
  onError?: (error: Error) => void;
}

export interface UseMarketDataStreamReturn {
  isSubscribed: boolean;
  isConnected: boolean;
  subscription: MarketDataSubscription | null;
  latestPrices: Map<string, PriceUpdate>;
  marketStatus: MarketStatus | null;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols?: string[]) => void;
  getSubscriptions: () => void;
  error: Error | null;
}

export function useMarketDataStream(
  options: UseMarketDataStreamOptions = {}
): UseMarketDataStreamReturn {
  const {
    symbols = [],
    userId = 'anonymous',
    autoSubscribe = true,
    onPriceUpdate,
    onMarketStatus,
    onSubscriptionChange,
    onError,
  } = options;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [subscription, setSubscription] =
    useState<MarketDataSubscription | null>(null);
  const [latestPrices, setLatestPrices] = useState<Map<string, PriceUpdate>>(
    new Map()
  );
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handlersSetupRef = useRef(false);
  const subscriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to market data
  const subscribe = useCallback(
    (symbolsToSubscribe: string[]): void => {
      if (!webSocketService.isConnected()) {
        const error = new Error('WebSocket not connected');
        setError(error);
        onError?.(error);
        return;
      }

      if (symbolsToSubscribe.length === 0) {
        logger.warn('No symbols provided for subscription');
        return;
      }

      logger.info('Subscribing to market data:', {
        symbols: symbolsToSubscribe,
      });

      webSocketService.subscribeToMarketData(symbolsToSubscribe, userId);
    },
    [userId, onError]
  );

  // Set up WebSocket event handlers
  const setupEventHandlers = useCallback(() => {
    if (handlersSetupRef.current) return;

    const handlePriceUpdate = (update: PriceUpdate): void => {
      logger.debug('Price update received:', { update });

      setLatestPrices(prev => {
        const newMap = new Map(prev);
        newMap.set(update.symbol, update);
        return newMap;
      });

      onPriceUpdate?.(update);
    };

    const handleMarketStatus = (status: MarketStatus): void => {
      logger.info('Market status update:', { status });
      setMarketStatus(status);
      onMarketStatus?.(status);
    };

    const handleSubscribed = (data: {
      subscriptionId: string;
      symbols: string[];
      timestamp: number;
    }): void => {
      logger.info('Market data subscription confirmed:', data);
      setIsSubscribed(true);
      setError(null);

      const newSubscription: MarketDataSubscription = {
        subscriptionId: data.subscriptionId,
        symbols: data.symbols,
        createdAt: data.timestamp,
        lastUpdate: data.timestamp,
      };

      setSubscription(newSubscription);
      onSubscriptionChange?.(newSubscription);
    };

    const handleUnsubscribed = (data: {
      symbols: string[];
      timestamp: number;
    }): void => {
      logger.info('Market data unsubscription confirmed:', data);

      if (subscription) {
        const remainingSymbols = subscription.symbols.filter(
          symbol => !data.symbols.includes(symbol)
        );

        if (remainingSymbols.length === 0) {
          setIsSubscribed(false);
          setSubscription(null);
          onSubscriptionChange?.(null);
        } else {
          const updatedSubscription: MarketDataSubscription = {
            ...subscription,
            symbols: remainingSymbols,
            lastUpdate: data.timestamp,
          };
          setSubscription(updatedSubscription);
          onSubscriptionChange?.(updatedSubscription);
        }
      }

      // Remove prices for unsubscribed symbols
      setLatestPrices(prev => {
        const newMap = new Map(prev);
        data.symbols.forEach(symbol => newMap.delete(symbol));
        return newMap;
      });
    };

    const handleSubscriptions = (data: {
      subscription: MarketDataSubscription | null;
      timestamp: number;
    }): void => {
      logger.info('Current subscriptions received:', data);
      setSubscription(data.subscription);
      setIsSubscribed(!!data.subscription);
      onSubscriptionChange?.(data.subscription);
    };

    const handleConnectionError = (err: Error): void => {
      logger.error(
        'Market data connection error:',
        { error: err.message },
        err
      );
      setError(err);
      setIsConnected(false);
      onError?.(err);
    };

    const handleReconnect = (): void => {
      logger.info('Market data reconnected');
      setIsConnected(true);
      setError(null);

      // Re-subscribe to symbols if we had a subscription
      if (subscription && subscription.symbols.length > 0) {
        subscribe(subscription.symbols);
      }
    };

    const handleDisconnect = (): void => {
      logger.info('Market data disconnected');
      setIsConnected(false);
    };

    // Set up WebSocket event handlers
    webSocketService.setEventHandlers({
      onConnectionError: handleConnectionError,
      onReconnect: handleReconnect,
      onDisconnect: handleDisconnect,
    });

    // Set up market data specific handlers using socket.io events
    webSocketService.onMarketDataEvent(
      'market_data:price_update',
      (data: unknown) => {
        handlePriceUpdate(data as PriceUpdate);
      }
    );
    webSocketService.onMarketDataEvent(
      'market_data:status',
      (data: unknown) => {
        handleMarketStatus(data as MarketStatus);
      }
    );
    webSocketService.onMarketDataEvent(
      'market_data:subscribed',
      (data: unknown) => {
        handleSubscribed(
          data as {
            subscriptionId: string;
            symbols: string[];
            timestamp: number;
          }
        );
      }
    );
    webSocketService.onMarketDataEvent(
      'market_data:unsubscribed',
      (data: unknown) => {
        handleUnsubscribed(data as { symbols: string[]; timestamp: number });
      }
    );
    webSocketService.onMarketDataEvent(
      'market_data:subscriptions',
      (data: unknown) => {
        handleSubscriptions(
          data as {
            subscription: MarketDataSubscription | null;
            timestamp: number;
          }
        );
      }
    );

    handlersSetupRef.current = true;
  }, [
    subscription,
    onPriceUpdate,
    onMarketStatus,
    onSubscriptionChange,
    onError,
    subscribe,
  ]);

  // Unsubscribe from market data
  const unsubscribe = useCallback((symbolsToUnsubscribe?: string[]): void => {
    if (!webSocketService.isConnected()) {
      logger.warn('Cannot unsubscribe: WebSocket not connected');
      return;
    }

    logger.info('Unsubscribing from market data:', {
      symbols: symbolsToUnsubscribe || 'all',
    });

    webSocketService.unsubscribeFromMarketData(symbolsToUnsubscribe);
  }, []);

  // Get current subscriptions
  const getSubscriptions = useCallback((): void => {
    if (!webSocketService.isConnected()) {
      logger.warn('Cannot get subscriptions: WebSocket not connected');
      return;
    }

    webSocketService.getMarketDataSubscriptions();
  }, []);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = (): void => {
      const connected = webSocketService.isConnected();
      if (connected !== isConnected) {
        setIsConnected(connected);
      }
    };

    const interval = setInterval(checkConnection, 1000);
    return (): void => clearInterval(interval);
  }, [isConnected]);

  // Set up event handlers when WebSocket is connected
  useEffect(() => {
    if (isConnected) {
      setupEventHandlers();
    }
  }, [isConnected, setupEventHandlers]);

  // Auto-subscribe to symbols
  useEffect(() => {
    if (autoSubscribe && isConnected && symbols.length > 0 && !isSubscribed) {
      // Delay subscription to ensure handlers are set up
      subscriptionTimeoutRef.current = setTimeout(() => {
        subscribe(symbols);
      }, 100);
    }

    return (): void => {
      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
      }
    };
  }, [autoSubscribe, isConnected, symbols, isSubscribed, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (isSubscribed) {
        unsubscribe();
      }

      if (subscriptionTimeoutRef.current) {
        clearTimeout(subscriptionTimeoutRef.current);
      }

      // Clean up event handlers
      webSocketService.offMarketDataEvent('market_data:price_update');
      webSocketService.offMarketDataEvent('market_data:status');
      webSocketService.offMarketDataEvent('market_data:subscribed');
      webSocketService.offMarketDataEvent('market_data:unsubscribed');
      webSocketService.offMarketDataEvent('market_data:subscriptions');

      handlersSetupRef.current = false;
    };
  }, [isSubscribed, unsubscribe]);

  return {
    isSubscribed,
    isConnected,
    subscription,
    latestPrices,
    marketStatus,
    subscribe,
    unsubscribe,
    getSubscriptions,
    error,
  };
}
