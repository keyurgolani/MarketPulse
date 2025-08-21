/**
 * Market Summary Widget Component
 * Displays key market indices and statistics
 */

import React, { useEffect, useState, useCallback } from 'react';
import { marketDataService } from '@/services/marketDataService';
import { Loading } from '@/components/ui/Loading';
import type { Widget } from '@/types/widget';
import type { Asset } from '@/types/market';
import { formatPrice, formatPercentage } from '@/types/market';

export interface MarketSummaryWidgetProps {
  /** Widget configuration */
  widget: Widget;
  /** Whether widget is in edit mode */
  isEditing?: boolean;
  /** Callback when widget needs update */
  onUpdate?: (updates: Partial<Widget>) => void;
  /** Optional className */
  className?: string;
}

interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const DEFAULT_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^RUT', name: 'Russell 2000' },
];

export const MarketSummaryWidget: React.FC<MarketSummaryWidgetProps> = ({
  widget,
  isEditing = false,
  // onUpdate, // TODO: Implement widget updates
  className = '',
}) => {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [topGainers, setTopGainers] = useState<Asset[]>([]);
  const [topLosers, setTopLosers] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract configuration
  const config = widget.config;
  const refreshInterval = config.refreshInterval || 300000; // 5 minutes
  const customSettings = (config.customSettings || {}) as Record<
    string,
    unknown
  >;
  const showGainersLosers = customSettings.showGainersLosers ?? true;
  const maxItems = (customSettings.maxItems as number) || 5;

  // Load market data
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Load market indices
      const indicesPromises = DEFAULT_INDICES.map(async index => {
        try {
          const response = await marketDataService.getAsset(index.symbol);
          if (response.success && response.data) {
            return {
              symbol: index.symbol,
              name: index.name,
              price: response.data.price,
              change: response.data.change,
              changePercent: response.data.changePercent,
            };
          }
        } catch (err) {
          console.warn(`Failed to load ${index.symbol}:`, err);
        }
        return null;
      });

      const indicesResults = await Promise.all(indicesPromises);
      const validIndices = indicesResults.filter(
        (index): index is MarketIndex => index !== null
      );
      setIndices(validIndices);

      // Load top gainers and losers (mock data for now)
      if (showGainersLosers) {
        // TODO: Implement actual API endpoints for gainers/losers
        const mockGainers: Asset[] = [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: 150.25,
            change: 5.75,
            changePercent: 3.98,
            volume: 45000000,
            currency: 'USD',
            lastUpdated: new Date(),
            source: 'yahoo',
            exchange: 'NASDAQ',
            type: 'stock',
            isMarketOpen: true,
          },
          {
            symbol: 'MSFT',
            name: 'Microsoft Corporation',
            price: 285.5,
            change: 8.25,
            changePercent: 2.98,
            volume: 32000000,
            currency: 'USD',
            lastUpdated: new Date(),
            source: 'yahoo',
            exchange: 'NASDAQ',
            type: 'stock',
            isMarketOpen: true,
          },
        ];

        const mockLosers: Asset[] = [
          {
            symbol: 'TSLA',
            name: 'Tesla, Inc.',
            price: 195.75,
            change: -12.5,
            changePercent: -6.0,
            volume: 55000000,
            currency: 'USD',
            lastUpdated: new Date(),
            source: 'yahoo',
            exchange: 'NASDAQ',
            type: 'stock',
            isMarketOpen: true,
          },
          {
            symbol: 'NFLX',
            name: 'Netflix, Inc.',
            price: 385.25,
            change: -15.75,
            changePercent: -3.93,
            volume: 28000000,
            currency: 'USD',
            lastUpdated: new Date(),
            source: 'yahoo',
            exchange: 'NASDAQ',
            type: 'stock',
            isMarketOpen: true,
          },
        ];

        setTopGainers(mockGainers.slice(0, maxItems));
        setTopLosers(mockLosers.slice(0, maxItems));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load market summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [showGainersLosers, maxItems]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up refresh interval
  useEffect((): (() => void) | void => {
    if (!refreshInterval || isEditing) return;

    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [loadData, refreshInterval, isEditing]);

  // Get change color class
  const getChangeColorClass = useCallback((change: number): string => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`market-summary-widget ${className}`}>
        <div className="flex items-center justify-center h-64">
          <Loading text="Loading market summary..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`market-summary-widget ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 text-red-600 dark:text-red-400">
          <div className="text-sm font-medium">
            Failed to load market summary
          </div>
          <div className="text-xs mt-1">{error}</div>
          <button
            onClick={loadData}
            className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`market-summary-widget ${className}`}>
      {/* Market Indices */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Market Indices
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {indices.map(index => (
            <div
              key={index.symbol}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {index.name}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                {formatPrice(index.price, 'USD')}
              </div>
              <div
                className={`text-sm font-medium mt-1 ${getChangeColorClass(index.change)}`}
              >
                {formatPrice(index.change, 'USD')} (
                {formatPercentage(index.changePercent)})
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Gainers and Losers */}
      {showGainersLosers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Gainers */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              Top Gainers
            </h4>
            <div className="space-y-2">
              {topGainers.map(asset => (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {asset.symbol}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {asset.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-white">
                      {formatPrice(asset.price, asset.currency)}
                    </div>
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      +{formatPercentage(asset.changePercent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
              Top Losers
            </h4>
            <div className="space-y-2">
              {topLosers.map(asset => (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {asset.symbol}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {asset.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-white">
                      {formatPrice(asset.price, asset.currency)}
                    </div>
                    <div className="text-sm font-medium text-red-600 dark:text-red-400">
                      {formatPercentage(asset.changePercent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Last updated indicator */}
      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MarketSummaryWidget;
