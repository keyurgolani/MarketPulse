/**
 * Market Summary Widget Component
 * Displays market indices, sector performance, and key metrics
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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

interface MarketData {
  indices: Asset[];
  sectors: Asset[];
  commodities: Asset[];
  currencies: Asset[];
}

export const MarketSummaryWidget: React.FC<MarketSummaryWidgetProps> = ({
  widget,
  isEditing = false,
  className = '',
}) => {
  const [marketData, setMarketData] = useState<MarketData>({
    indices: [],
    sectors: [],
    commodities: [],
    currencies: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<keyof MarketData>('indices');

  // Extract configuration
  const config = widget.config;
  const refreshInterval = config.refreshInterval || 60000; // 1 minute
  const customSettings = (config.customSettings || {}) as Record<
    string,
    unknown
  >;

  // Market summary configuration
  const showIndices = customSettings.showIndices ?? true;
  const showSectors = customSettings.showSectors ?? true;
  const showCommodities = customSettings.showCommodities ?? false;
  const showCurrencies = customSettings.showCurrencies ?? false;
  const layout = (customSettings.layout as string) || 'tabs'; // 'tabs' | 'grid' | 'list'
  const colorScheme = (customSettings.colorScheme as string) || 'default';
  const showSparklines = customSettings.showSparklines ?? false;

  // Default market symbols
  const defaultIndices = useMemo(() => ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'], []);
  const defaultSectors = useMemo(
    () => [
      'XLK',
      'XLF',
      'XLV',
      'XLE',
      'XLI',
      'XLY',
      'XLP',
      'XLU',
      'XLB',
      'XLRE',
      'XLC',
    ],
    []
  );
  const defaultCommodities = useMemo(
    () => ['GLD', 'SLV', 'USO', 'UNG', 'DBA'],
    []
  );
  const defaultCurrencies = useMemo(
    () => ['UUP', 'FXE', 'FXY', 'FXB', 'FXC'],
    []
  );

  // Load market data
  const loadMarketData = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      const requests: Promise<{ type: string; data: Asset[] }>[] = [];

      // Load indices
      if (showIndices) {
        requests.push(
          marketDataService
            .getAssets({ symbols: defaultIndices })
            .then(response => ({ type: 'indices', data: response.data || [] }))
        );
      }

      // Load sectors
      if (showSectors) {
        requests.push(
          marketDataService
            .getAssets({ symbols: defaultSectors })
            .then(response => ({ type: 'sectors', data: response.data || [] }))
        );
      }

      // Load commodities
      if (showCommodities) {
        requests.push(
          marketDataService
            .getAssets({ symbols: defaultCommodities })
            .then(response => ({
              type: 'commodities',
              data: response.data || [],
            }))
        );
      }

      // Load currencies
      if (showCurrencies) {
        requests.push(
          marketDataService
            .getAssets({ symbols: defaultCurrencies })
            .then(response => ({
              type: 'currencies',
              data: response.data || [],
            }))
        );
      }

      const results = await Promise.all(requests);

      const newMarketData: MarketData = {
        indices: [],
        sectors: [],
        commodities: [],
        currencies: [],
      };

      results.forEach(result => {
        if (result.type === 'indices') {
          newMarketData.indices = result.data;
        } else if (result.type === 'sectors') {
          newMarketData.sectors = result.data;
        } else if (result.type === 'commodities') {
          newMarketData.commodities = result.data;
        } else if (result.type === 'currencies') {
          newMarketData.currencies = result.data;
        }
      });

      setMarketData(newMarketData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load market data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    showIndices,
    showSectors,
    showCommodities,
    showCurrencies,
    defaultIndices,
    defaultSectors,
    defaultCommodities,
    defaultCurrencies,
  ]);

  // Initial load
  useEffect(() => {
    loadMarketData();
  }, [loadMarketData]);

  // Set up refresh interval
  useEffect((): (() => void) | void => {
    if (!refreshInterval || isEditing) return;

    const interval = setInterval(loadMarketData, refreshInterval);
    return () => clearInterval(interval);
  }, [loadMarketData, refreshInterval, isEditing]);

  // Get available tabs
  const availableTabs = useMemo((): Array<{
    key: keyof MarketData;
    label: string;
    count: number;
  }> => {
    const tabs: Array<{ key: keyof MarketData; label: string; count: number }> =
      [];

    if (showIndices) {
      tabs.push({
        key: 'indices',
        label: 'Indices',
        count: marketData.indices.length,
      });
    }
    if (showSectors) {
      tabs.push({
        key: 'sectors',
        label: 'Sectors',
        count: marketData.sectors.length,
      });
    }
    if (showCommodities) {
      tabs.push({
        key: 'commodities',
        label: 'Commodities',
        count: marketData.commodities.length,
      });
    }
    if (showCurrencies) {
      tabs.push({
        key: 'currencies',
        label: 'Currencies',
        count: marketData.currencies.length,
      });
    }

    return tabs;
  }, [showIndices, showSectors, showCommodities, showCurrencies, marketData]);

  // Get change color class
  const getChangeColorClass = useCallback(
    (change: number): string => {
      if (colorScheme === 'monochrome')
        return 'text-gray-600 dark:text-gray-400';

      if (change > 0) return 'text-green-600 dark:text-green-400';
      if (change < 0) return 'text-red-600 dark:text-red-400';
      return 'text-gray-600 dark:text-gray-400';
    },
    [colorScheme]
  );

  // Get market status
  const getMarketStatus = useCallback(() => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Simple market hours check (9:30 AM - 4:00 PM ET, Mon-Fri)
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = hour >= 9 && hour < 16;

    return {
      isOpen: isWeekday && isMarketHours,
      status: isWeekday && isMarketHours ? 'Open' : 'Closed',
    };
  }, []);

  // Render asset list
  const renderAssetList = useCallback(
    (assets: Asset[], title: string) => {
      if (!assets.length) {
        return (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            <div className="text-sm">
              No {title.toLowerCase()} data available
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-2">
          {assets.map(asset => (
            <div
              key={asset.symbol}
              className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-2 h-2 rounded-full ${asset.isMarketOpen ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {asset.symbol}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-24">
                    {asset.name}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {formatPrice(asset.price, asset.currency)}
                </div>
                <div
                  className={`text-xs font-medium ${getChangeColorClass(asset.change)}`}
                >
                  {formatPrice(asset.change, asset.currency)} (
                  {formatPercentage(asset.changePercent)})
                </div>
              </div>

              {showSparklines && (
                <div className="ml-2 w-12 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    📈
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    },
    [getChangeColorClass, showSparklines]
  );

  // Render loading state
  if (isLoading) {
    return (
      <div className={`market-summary-widget ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loading text="Loading market data..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`market-summary-widget ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-red-600 dark:text-red-400">
          <div className="text-sm font-medium">Failed to load market data</div>
          <div className="text-xs mt-1">{error}</div>
          <button
            onClick={loadMarketData}
            className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const marketStatus = getMarketStatus();

  return (
    <div className={`market-summary-widget ${className}`}>
      {/* Market status header */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${marketStatus.isOpen ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Market {marketStatus.status}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Layout: Tabs */}
      {layout === 'tabs' && (
        <>
          {/* Tab navigation */}
          <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {availableTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 text-xs opacity-75">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-32">
            {activeTab === 'indices' &&
              renderAssetList(marketData.indices, 'Indices')}
            {activeTab === 'sectors' &&
              renderAssetList(marketData.sectors, 'Sectors')}
            {activeTab === 'commodities' &&
              renderAssetList(marketData.commodities, 'Commodities')}
            {activeTab === 'currencies' &&
              renderAssetList(marketData.currencies, 'Currencies')}
          </div>
        </>
      )}

      {/* Layout: Grid */}
      {layout === 'grid' && (
        <div className="grid grid-cols-2 gap-4">
          {showIndices && marketData.indices.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Indices
              </h4>
              {renderAssetList(marketData.indices.slice(0, 3), 'Indices')}
            </div>
          )}
          {showSectors && marketData.sectors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Sectors
              </h4>
              {renderAssetList(marketData.sectors.slice(0, 3), 'Sectors')}
            </div>
          )}
          {showCommodities && marketData.commodities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Commodities
              </h4>
              {renderAssetList(
                marketData.commodities.slice(0, 3),
                'Commodities'
              )}
            </div>
          )}
          {showCurrencies && marketData.currencies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Currencies
              </h4>
              {renderAssetList(marketData.currencies.slice(0, 3), 'Currencies')}
            </div>
          )}
        </div>
      )}

      {/* Layout: List */}
      {layout === 'list' && (
        <div className="space-y-4">
          {showIndices && marketData.indices.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Market Indices
              </h4>
              {renderAssetList(marketData.indices, 'Indices')}
            </div>
          )}
          {showSectors && marketData.sectors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Sector Performance
              </h4>
              {renderAssetList(marketData.sectors, 'Sectors')}
            </div>
          )}
          {showCommodities && marketData.commodities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Commodities
              </h4>
              {renderAssetList(marketData.commodities, 'Commodities')}
            </div>
          )}
          {showCurrencies && marketData.currencies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Currencies
              </h4>
              {renderAssetList(marketData.currencies, 'Currencies')}
            </div>
          )}
        </div>
      )}

      {/* Market statistics */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-600 dark:text-gray-400">Gainers</div>
            <div className="font-semibold text-green-600 dark:text-green-400">
              {
                [
                  ...marketData.indices,
                  ...marketData.sectors,
                  ...marketData.commodities,
                  ...marketData.currencies,
                ].filter(asset => asset.change > 0).length
              }
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Losers</div>
            <div className="font-semibold text-red-600 dark:text-red-400">
              {
                [
                  ...marketData.indices,
                  ...marketData.sectors,
                  ...marketData.commodities,
                  ...marketData.currencies,
                ].filter(asset => asset.change < 0).length
              }
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Avg Change</div>
            <div
              className={`font-semibold ${getChangeColorClass(
                [
                  ...marketData.indices,
                  ...marketData.sectors,
                  ...marketData.commodities,
                  ...marketData.currencies,
                ].reduce((sum, asset) => sum + asset.changePercent, 0) /
                  Math.max(
                    [
                      ...marketData.indices,
                      ...marketData.sectors,
                      ...marketData.commodities,
                      ...marketData.currencies,
                    ].length,
                    1
                  )
              )}`}
            >
              {formatPercentage(
                [
                  ...marketData.indices,
                  ...marketData.sectors,
                  ...marketData.commodities,
                  ...marketData.currencies,
                ].reduce((sum, asset) => sum + asset.changePercent, 0) /
                  Math.max(
                    [
                      ...marketData.indices,
                      ...marketData.sectors,
                      ...marketData.commodities,
                      ...marketData.currencies,
                    ].length,
                    1
                  )
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-600 dark:text-gray-400">Total Assets</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {
                [
                  ...marketData.indices,
                  ...marketData.sectors,
                  ...marketData.commodities,
                  ...marketData.currencies,
                ].length
              }
            </div>
          </div>
        </div>
      </div>

      {/* Last updated indicator */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MarketSummaryWidget;
