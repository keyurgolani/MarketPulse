/**
 * Watchlist Widget Component
 * Customizable watchlist with add/remove functionality
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { marketDataService } from '@/services/marketDataService';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import type { Widget } from '@/types/widget';
import type { Asset } from '@/types/market';
import { formatPrice, formatPercentage } from '@/types/market';

export interface WatchlistWidgetProps {
  /** Widget configuration */
  widget: Widget;
  /** Whether widget is in edit mode */
  isEditing?: boolean;
  /** Callback when widget needs update */
  onUpdate?: (updates: Partial<Widget>) => void;
  /** Optional className */
  className?: string;
}

interface SortConfig {
  field: keyof Asset;
  direction: 'asc' | 'desc';
}

export const WatchlistWidget: React.FC<WatchlistWidgetProps> = ({
  widget,
  isEditing = false,
  onUpdate,
  className = '',
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'symbol',
    direction: 'asc',
  });

  // Extract configuration
  const config = widget.config;
  const symbols = useMemo(() => config.assets || [], [config.assets]);
  const refreshInterval = config.refreshInterval || 30000;
  const customSettings = (config.customSettings || {}) as Record<
    string,
    unknown
  >;

  // Watchlist configuration
  const watchlistName = (customSettings.name as string) || 'My Watchlist';
  const showAlerts = customSettings.showAlerts ?? true;
  const showNews = customSettings.showNews ?? false;
  const showAddButton = customSettings.showAddButton ?? true;
  const showRemoveButton = customSettings.showRemoveButton ?? true;
  const enableSearch = customSettings.enableSearch ?? true;
  const maxItems = (customSettings.maxItems as number) || 50;

  // Load asset data
  const loadAssets = useCallback(async (): Promise<void> => {
    if (!symbols.length) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await marketDataService.getAssets({ symbols });

      if (response.success && response.data) {
        setAssets(response.data);
      } else {
        throw new Error('Failed to load watchlist data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load watchlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbols]);

  // Initial load
  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Set up refresh interval
  useEffect((): (() => void) | void => {
    if (!refreshInterval || isEditing) return;

    const interval = setInterval(loadAssets, refreshInterval);
    return () => clearInterval(interval);
  }, [loadAssets, refreshInterval, isEditing]);

  // Handle adding new symbol
  const handleAddSymbol = useCallback(async (): Promise<void> => {
    if (!newSymbol.trim() || symbols.includes(newSymbol.toUpperCase())) {
      return;
    }

    if (symbols.length >= maxItems) {
      alert(`Maximum ${maxItems} assets allowed in watchlist`);
      return;
    }

    const updatedSymbols = [...symbols, newSymbol.toUpperCase()];
    onUpdate?.({
      config: {
        ...config,
        assets: updatedSymbols,
      },
    });
    setNewSymbol('');
  }, [newSymbol, symbols, maxItems, config, onUpdate]);

  // Handle removing symbol
  const handleRemoveSymbol = useCallback(
    (symbolToRemove: string): void => {
      const updatedSymbols = symbols.filter(s => s !== symbolToRemove);
      onUpdate?.({
        config: {
          ...config,
          assets: updatedSymbols,
        },
      });
    },
    [symbols, config, onUpdate]
  );

  // Handle sorting
  const handleSort = useCallback((field: keyof Asset): void => {
    setSortConfig(prev => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = assets.filter(
        asset =>
          asset.symbol.toLowerCase().includes(query) ||
          asset.name.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      }

      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });
  }, [assets, searchQuery, sortConfig]);

  // Get sort indicator
  const getSortIndicator = useCallback(
    (field: keyof Asset): string => {
      if (sortConfig.field !== field) return '';
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    },
    [sortConfig]
  );

  // Get change color class
  const getChangeColorClass = useCallback((change: number): string => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`watchlist-widget ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loading text="Loading watchlist..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`watchlist-widget ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-red-600 dark:text-red-400">
          <div className="text-sm font-medium">Failed to load watchlist</div>
          <div className="text-xs mt-1">{error}</div>
          <button
            onClick={loadAssets}
            className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`watchlist-widget ${className}`}>
      {/* Watchlist header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {watchlistName}
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {symbols.length}/{maxItems} assets
        </div>
      </div>

      {/* Search bar */}
      {enableSearch && assets.length > 5 && (
        <div className="mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {/* Add new asset */}
      {showAddButton && isEditing && (
        <div className="mb-3 flex space-x-2">
          <input
            type="text"
            value={newSymbol}
            onChange={e => setNewSymbol(e.target.value.toUpperCase())}
            placeholder="Add symbol (e.g., AAPL)"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            onKeyPress={e => e.key === 'Enter' && handleAddSymbol()}
          />
          <Button
            onClick={handleAddSymbol}
            size="sm"
            disabled={
              !newSymbol.trim() || symbols.includes(newSymbol.toUpperCase())
            }
          >
            Add
          </Button>
        </div>
      )}

      {/* Asset list */}
      {filteredAndSortedAssets.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th
                  className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('symbol')}
                >
                  Symbol{getSortIndicator('symbol')}
                </th>
                <th
                  className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  Price{getSortIndicator('price')}
                </th>
                <th
                  className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('changePercent')}
                >
                  Change{getSortIndicator('changePercent')}
                </th>
                {showRemoveButton && isEditing && (
                  <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedAssets.map(asset => (
                <tr
                  key={asset.symbol}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${asset.isMarketOpen ? 'bg-green-500' : 'bg-gray-400'}`}
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {asset.symbol}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-24">
                          {asset.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatPrice(asset.price, asset.currency)}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div
                      className={`font-medium ${getChangeColorClass(asset.change)}`}
                    >
                      <div>{formatPrice(asset.change, asset.currency)}</div>
                      <div className="text-xs">
                        {formatPercentage(asset.changePercent)}
                      </div>
                    </div>
                  </td>
                  {showRemoveButton && isEditing && (
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleRemoveSymbol(asset.symbol)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                        aria-label={`Remove ${asset.symbol} from watchlist`}
                        title={`Remove ${asset.symbol}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-sm">
              {searchQuery ? 'No matching assets' : 'No assets in watchlist'}
            </div>
            <div className="text-xs mt-1">
              {searchQuery
                ? 'Try a different search term'
                : 'Add assets to get started'}
            </div>
          </div>
        </div>
      )}

      {/* Watchlist stats */}
      {assets.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-600 dark:text-gray-400">
                Total Assets
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {assets.length}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Avg Change</div>
              <div
                className={`font-semibold ${getChangeColorClass(
                  assets.reduce((sum, asset) => sum + asset.changePercent, 0) /
                    assets.length
                )}`}
              >
                {formatPercentage(
                  assets.reduce((sum, asset) => sum + asset.changePercent, 0) /
                    assets.length
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Gainers</div>
              <div className="font-semibold text-green-600 dark:text-green-400">
                {assets.filter(asset => asset.change > 0).length}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Losers</div>
              <div className="font-semibold text-red-600 dark:text-red-400">
                {assets.filter(asset => asset.change < 0).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price alerts section */}
      {showAlerts && assets.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Price Alerts
            </div>
            <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Manage
            </button>
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300">
            No active alerts configured
          </div>
        </div>
      )}

      {/* Related news section */}
      {showNews && assets.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Related News
          </div>
          <div className="text-xs text-green-700 dark:text-green-300">
            Loading news for watchlist assets...
          </div>
        </div>
      )}

      {/* Last updated indicator */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default WatchlistWidget;
