/**
 * Asset Grid Widget Component
 * Displays assets in a responsive grid layout with cards
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { marketDataService } from '@/services/marketDataService';
import { Loading } from '@/components/ui/Loading';
import type { Widget } from '@/types/widget';
import type { Asset } from '@/types/market';
import { formatPrice, formatPercentage, formatVolume } from '@/types/market';

export interface AssetGridWidgetProps {
  /** Widget configuration */
  widget: Widget;
  /** Whether widget is in edit mode */
  isEditing?: boolean;
  /** Callback when widget needs update */
  onUpdate?: (updates: Partial<Widget>) => void;
  /** Optional className */
  className?: string;
}

export const AssetGridWidget: React.FC<AssetGridWidgetProps> = ({
  widget,
  isEditing = false,
  className = '',
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract configuration
  const config = widget.config;
  const symbols = useMemo(() => config.assets || [], [config.assets]);
  const refreshInterval = config.refreshInterval || 30000;
  const customSettings = (config.customSettings || {}) as Record<
    string,
    unknown
  >;

  // Grid configuration
  const columns = customSettings.columns || 3;
  const showLogos = customSettings.showLogos ?? true;
  const showMetrics = Boolean(customSettings.showMetrics ?? true);
  const showSparklines = Boolean(customSettings.showSparklines ?? false);
  const colorScheme = customSettings.colorScheme || 'default';
  const cardSize = customSettings.cardSize || 'medium';

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

  // Get grid classes
  const getGridClasses = useMemo((): string => {
    const baseClasses = 'grid gap-4';
    const columnClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
      6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    };
    return `${baseClasses} ${columnClasses[columns as keyof typeof columnClasses] || columnClasses[3]}`;
  }, [columns]);

  // Get card size classes
  const getCardSizeClasses = useMemo((): string => {
    const sizeClasses = {
      small: 'p-3',
      medium: 'p-4',
      large: 'p-6',
    };
    return (
      sizeClasses[cardSize as keyof typeof sizeClasses] || sizeClasses.medium
    );
  }, [cardSize]);

  // Get change color class
  const getChangeColorClass = useCallback(
    (change: number): string => {
      if (colorScheme === 'monochrome')
        return 'text-gray-600 dark:text-gray-400';

      const colorSchemes = {
        default: {
          positive: 'text-green-600 dark:text-green-400',
          negative: 'text-red-600 dark:text-red-400',
          neutral: 'text-gray-600 dark:text-gray-400',
        },
        'green-red': {
          positive: 'text-green-600 dark:text-green-400',
          negative: 'text-red-600 dark:text-red-400',
          neutral: 'text-gray-600 dark:text-gray-400',
        },
        'blue-orange': {
          positive: 'text-blue-600 dark:text-blue-400',
          negative: 'text-orange-600 dark:text-orange-400',
          neutral: 'text-gray-600 dark:text-gray-400',
        },
      };

      const scheme =
        colorSchemes[colorScheme as keyof typeof colorSchemes] ||
        colorSchemes.default;

      if (change > 0) return scheme.positive;
      if (change < 0) return scheme.negative;
      return scheme.neutral;
    },
    [colorScheme]
  );

  // Get background color for change
  const getChangeBgClass = useCallback(
    (change: number): string => {
      if (colorScheme === 'monochrome') return '';

      if (change > 0) return 'bg-green-50 dark:bg-green-900/20';
      if (change < 0) return 'bg-red-50 dark:bg-red-900/20';
      return '';
    },
    [colorScheme]
  );

  // Render loading state
  if (isLoading) {
    return (
      <div className={`asset-grid-widget ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loading text="Loading assets..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`asset-grid-widget ${className}`}>
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
  if (!assets.length) {
    return (
      <div className={`asset-grid-widget ${className}`}>
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
    <div className={`asset-grid-widget ${className}`}>
      <div className={getGridClasses}>
        {assets.map(asset => {
          return (
            <div
              key={asset.symbol}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 ${getCardSizeClasses} ${getChangeBgClass(asset.change)}`}
            >
              {/* Header with symbol and logo */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {showLogos && (
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                        {asset.symbol.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {asset.symbol}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-20">
                      {asset.name}
                    </div>
                  </div>
                </div>

                {/* Market status indicator */}
                <div
                  className={`w-2 h-2 rounded-full ${asset.isMarketOpen ? 'bg-green-500' : 'bg-gray-400'}`}
                />
              </div>

              {/* Price information */}
              <div className="mb-3">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPrice(asset.price, asset.currency)}
                </div>
                <div
                  className={`text-sm font-medium ${getChangeColorClass(asset.change)}`}
                >
                  {formatPrice(asset.change, asset.currency)} (
                  {formatPercentage(asset.changePercent)})
                </div>
              </div>

              {/* Additional metrics */}
              {showMetrics && (
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Volume:</span>
                    <span>{formatVolume(asset.volume)}</span>
                  </div>
                  {asset.marketCap && (
                    <div className="flex justify-between">
                      <span>Market Cap:</span>
                      <span>{formatVolume(asset.marketCap)}</span>
                    </div>
                  )}
                  {asset.dayHigh && asset.dayLow && (
                    <div className="flex justify-between">
                      <span>Day Range:</span>
                      <span>
                        {formatPrice(asset.dayLow, asset.currency)} -{' '}
                        {formatPrice(asset.dayHigh, asset.currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Sparkline placeholder */}
              {showSparklines && (
                <div className="mt-3 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Chart
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Last updated indicator */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default AssetGridWidget;
