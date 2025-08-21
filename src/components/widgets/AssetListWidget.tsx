/**
 * Asset List Widget Component
 * Displays a list of assets with real-time prices and changes
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { marketDataService } from '@/services/marketDataService';
import { Loading } from '@/components/ui/Loading';
import type { Widget } from '@/types/widget';
import type { Asset } from '@/types/market';
import { formatPrice, formatPercentage, formatVolume } from '@/types/market';

export interface AssetListWidgetProps {
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

export const AssetListWidget: React.FC<AssetListWidgetProps> = ({
  widget,
  isEditing = false,
  className = '',
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Extract boolean settings
  const showChange = Boolean(customSettings.showChange ?? true);
  const showVolume = Boolean(customSettings.showVolume ?? true);
  const showMarketCap = Boolean(customSettings.showMarketCap ?? true);

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
        throw new Error('Failed to load asset data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load assets:', err);
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

  // Handle sorting
  const handleSort = useCallback((field: keyof Asset): void => {
    setSortConfig(prev => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Sort assets
  const sortedAssets = useMemo(() => {
    if (!assets.length) return [];

    return [...assets].sort((a, b) => {
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
  }, [assets, sortConfig]);

  // Get sort indicator
  const getSortIndicator = useCallback(
    (field: keyof Asset): string => {
      if (sortConfig.field !== field) return '';
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    },
    [sortConfig]
  );

  // Get change color class
  const getChangeColorClass = useCallback(
    (change: number): string => {
      if (!customSettings.colorCodeChanges) return '';
      if (change > 0) return 'text-green-600 dark:text-green-400';
      if (change < 0) return 'text-red-600 dark:text-red-400';
      return 'text-gray-600 dark:text-gray-400';
    },
    [customSettings.colorCodeChanges]
  );

  // Render loading state
  if (isLoading) {
    return (
      <div className={`asset-list-widget ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loading text="Loading assets..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`asset-list-widget ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-red-600 dark:text-red-400">
          <div className="text-sm font-medium">Failed to load assets</div>
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

  // Render empty state
  if (!sortedAssets.length) {
    return (
      <div className={`asset-list-widget ${className}`}>
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-sm">No assets configured</div>
            <div className="text-xs mt-1">Add assets to display data</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`asset-list-widget ${className}`}>
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
                className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('name')}
              >
                Name{getSortIndicator('name')}
              </th>
              <th
                className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => handleSort('price')}
              >
                Price{getSortIndicator('price')}
              </th>
              {showChange && (
                <th
                  className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('change')}
                >
                  Change{getSortIndicator('change')}
                </th>
              )}
              {showVolume && (
                <th
                  className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('volume')}
                >
                  Volume{getSortIndicator('volume')}
                </th>
              )}
              {showMarketCap && (
                <th
                  className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('marketCap')}
                >
                  Market Cap{getSortIndicator('marketCap')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map(asset => (
              <tr
                key={asset.symbol}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  customSettings.highlightMovers &&
                  Math.abs(asset.changePercent) > 5
                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                    : ''
                }`}
              >
                <td className="py-2 px-3">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {asset.symbol}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="text-gray-600 dark:text-gray-400 truncate max-w-32">
                    {asset.name}
                  </div>
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatPrice(asset.price, asset.currency)}
                  </div>
                </td>
                {showChange && (
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
                )}
                {showVolume && (
                  <td className="py-2 px-3 text-right">
                    <div className="text-gray-600 dark:text-gray-400">
                      {formatVolume(asset.volume)}
                    </div>
                  </td>
                )}
                {showMarketCap && asset.marketCap && (
                  <td className="py-2 px-3 text-right">
                    <div className="text-gray-600 dark:text-gray-400">
                      {formatVolume(asset.marketCap)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Last updated indicator */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default AssetListWidget;
