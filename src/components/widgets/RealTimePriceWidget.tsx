import React, { useEffect, useState, useMemo } from 'react';
import { useMarketDataStream } from '../../hooks/useMarketDataStream';
import type { PriceUpdate } from '../../hooks/useMarketDataStream';
import { ConnectionStatus } from '../ui/ConnectionStatus';
import { cn } from '../../utils/cn';
import { logger } from '../../utils/logger';

export interface RealTimePriceWidgetProps {
  symbols: string[];
  userId?: string;
  className?: string;
  showConnectionStatus?: boolean;
  updateInterval?: number;
  maxDisplaySymbols?: number;
}

interface PriceDisplayItem extends PriceUpdate {
  isUpdating: boolean;
  previousPrice?: number;
}

export const RealTimePriceWidget: React.FC<RealTimePriceWidgetProps> = ({
  symbols,
  userId = 'anonymous',
  className,
  showConnectionStatus = true,
  maxDisplaySymbols = 10,
}) => {
  const [displayPrices, setDisplayPrices] = useState<
    Map<string, PriceDisplayItem>
  >(new Map());
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const {
    isSubscribed,
    isConnected,
    latestPrices,
    marketStatus,
    subscribe,
    unsubscribe,
    error,
  } = useMarketDataStream({
    symbols,
    userId,
    autoSubscribe: true,
    onPriceUpdate: (update: PriceUpdate) => {
      logger.debug('Price update received in widget:', { update });
      setLastUpdateTime(Date.now());

      setDisplayPrices(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(update.symbol);

        newMap.set(update.symbol, {
          ...update,
          isUpdating: true,
          previousPrice: existing?.price,
        });

        return newMap;
      });

      // Clear updating state after animation
      setTimeout(() => {
        setDisplayPrices(prev => {
          const newMap = new Map(prev);
          const item = newMap.get(update.symbol);
          if (item) {
            newMap.set(update.symbol, {
              ...item,
              isUpdating: false,
            });
          }
          return newMap;
        });
      }, 1000);
    },
    onError: err => {
      logger.error('Market data stream error:', { error: err.message }, err);
    },
  });

  // Update display prices when latest prices change
  useEffect(() => {
    latestPrices.forEach((update, symbol) => {
      setDisplayPrices(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(symbol);

        if (!existing || existing.timestamp < update.timestamp) {
          newMap.set(symbol, {
            ...update,
            isUpdating: false,
            previousPrice: existing?.price,
          });
        }

        return newMap;
      });
    });
  }, [latestPrices]);

  // Memoize sorted symbols for display
  const sortedSymbols = useMemo(() => {
    return symbols.slice(0, maxDisplaySymbols).sort((a, b) => {
      const priceA = displayPrices.get(a);
      const priceB = displayPrices.get(b);

      // Sort by last update time (most recent first)
      if (priceA && priceB) {
        return priceB.timestamp - priceA.timestamp;
      }

      // Put symbols with data first
      if (priceA && !priceB) return -1;
      if (!priceA && priceB) return 1;

      // Alphabetical for symbols without data
      return a.localeCompare(b);
    });
  }, [symbols, displayPrices, maxDisplaySymbols]);

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number, changePercent: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getPriceChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getUpdateAnimation = (isUpdating: boolean, change?: number): string => {
    if (!isUpdating) return '';

    if (change && change > 0) {
      return 'animate-pulse bg-green-100 dark:bg-green-900/20';
    } else if (change && change < 0) {
      return 'animate-pulse bg-red-100 dark:bg-red-900/20';
    }

    return 'animate-pulse bg-blue-100 dark:bg-blue-900/20';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Real-Time Prices
        </h3>

        {showConnectionStatus && (
          <ConnectionStatus
            isConnected={isConnected && isSubscribed}
            isConnecting={!isConnected}
            lastUpdate={lastUpdateTime}
            error={error}
            size="sm"
          />
        )}
      </div>

      {/* Market status */}
      {marketStatus && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Market is {marketStatus.isOpen ? 'Open' : 'Closed'}
          {marketStatus.nextOpen && !marketStatus.isOpen && (
            <span className="ml-2">
              Opens: {new Date(marketStatus.nextOpen).toLocaleTimeString()}
            </span>
          )}
          {marketStatus.nextClose && marketStatus.isOpen && (
            <span className="ml-2">
              Closes: {new Date(marketStatus.nextClose).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Price list */}
      <div className="space-y-2">
        {sortedSymbols.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No symbols to display
          </div>
        ) : (
          sortedSymbols.map(symbol => {
            const priceData = displayPrices.get(symbol);

            return (
              <div
                key={symbol}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-all duration-300',
                  'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                  priceData &&
                    getUpdateAnimation(priceData.isUpdating, priceData.change)
                )}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {symbol}
                  </div>
                  {priceData && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Vol: {priceData.volume.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  {priceData ? (
                    <>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatPrice(priceData.price)}
                      </div>
                      <div
                        className={cn(
                          'text-sm',
                          getPriceChangeColor(priceData.change)
                        )}
                      >
                        {formatChange(
                          priceData.change,
                          priceData.changePercent
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400">
                      Loading...
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Subscription controls */}
      <div className="flex gap-2 text-xs">
        <button
          onClick={() => subscribe(symbols)}
          disabled={isSubscribed || !isConnected}
          className={cn(
            'px-3 py-1 rounded border transition-colors',
            isSubscribed || !isConnected
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
          )}
        >
          Subscribe
        </button>

        <button
          onClick={() => unsubscribe()}
          disabled={!isSubscribed || !isConnected}
          className={cn(
            'px-3 py-1 rounded border transition-colors',
            !isSubscribed || !isConnected
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
          )}
        >
          Unsubscribe
        </button>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 space-y-1">
          <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
          <div>Subscribed: {isSubscribed ? 'Yes' : 'No'}</div>
          <div>Symbols: {symbols.join(', ')}</div>
          <div>Updates: {displayPrices.size}</div>
        </div>
      )}
    </div>
  );
};

export default RealTimePriceWidget;
