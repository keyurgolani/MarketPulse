/**
 * Price Chart Widget Component
 * Displays interactive price charts with technical indicators
 */

import React, { useEffect, useState, useCallback } from 'react';
import { marketDataService } from '@/services/marketDataService';
import { Loading } from '@/components/ui/Loading';
import type { Widget, TimeFrame } from '@/types/widget';
import type { Asset, HistoricalData } from '@/types/market';
import { formatPrice, formatPercentage } from '@/types/market';

export interface PriceChartWidgetProps {
  /** Widget configuration */
  widget: Widget;
  /** Whether widget is in edit mode */
  isEditing?: boolean;
  /** Callback when widget needs update */
  onUpdate?: (updates: Partial<Widget>) => void;
  /** Optional className */
  className?: string;
}

export const PriceChartWidget: React.FC<PriceChartWidgetProps> = ({
  widget,
  isEditing = false,
  onUpdate,
  className = '',
}) => {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract configuration
  const config = widget.config;
  const symbols = config.assets || [];
  const symbol = symbols[0]; // Charts display single asset
  const timeframe = config.timeframe || '1D';
  const refreshInterval = config.refreshInterval || 60000;
  const customSettings = (config.customSettings || {}) as Record<
    string,
    unknown
  >;

  // Chart configuration
  const chartType = (customSettings.chartType as string) || 'line';
  const showVolume = customSettings.showVolume ?? true;
  const showIndicators = customSettings.showIndicators ?? false;
  const height = (customSettings.height as number) || 400;

  // Load asset and historical data
  const loadData = useCallback(async (): Promise<void> => {
    if (!symbol) {
      setAsset(null);
      setHistoricalData(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Load current asset data and historical data in parallel
      const [assetResponse, historicalResponse] = await Promise.all([
        marketDataService.getAsset(symbol),
        marketDataService.getHistoricalData({
          symbol,
          timeframe: timeframe as '1D' | '1W' | '1M' | '3M' | '1Y',
        }),
      ]);

      if (assetResponse.success && assetResponse.data) {
        setAsset(assetResponse.data);
      }

      if (historicalResponse.success && historicalResponse.data) {
        setHistoricalData(historicalResponse.data);
      }

      if (!assetResponse.success && !historicalResponse.success) {
        throw new Error('Failed to load chart data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load chart data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

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
      <div className={`price-chart-widget ${className}`}>
        <div className="flex items-center justify-center h-64">
          <Loading text="Loading chart..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`price-chart-widget ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 text-red-600 dark:text-red-400">
          <div className="text-sm font-medium">Failed to load chart</div>
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

  // Render empty state
  if (!symbol) {
    return (
      <div className={`price-chart-widget ${className}`}>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-sm">No asset selected</div>
            <div className="text-xs mt-1">
              Configure an asset to display chart
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`price-chart-widget ${className}`}>
      {/* Chart header */}
      {asset && (
        <div className="flex items-center justify-between mb-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {asset.symbol}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {asset.name}
              </div>
            </div>
            <div className="text-right">
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
          </div>

          {/* Chart controls */}
          <div className="flex items-center space-x-2">
            <select
              value={timeframe}
              onChange={e =>
                onUpdate?.({
                  config: { ...config, timeframe: e.target.value as TimeFrame },
                })
              }
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="1d">1D</option>
              <option value="1w">1W</option>
              <option value="1M">1M</option>
              <option value="3M">3M</option>
              <option value="6M">6M</option>
              <option value="1y">1Y</option>
            </select>

            <select
              value={chartType}
              onChange={e =>
                onUpdate?.({
                  config: {
                    ...config,
                    customSettings: {
                      ...customSettings,
                      chartType: e.target.value,
                    },
                  },
                })
              }
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="line">Line</option>
              <option value="candlestick">Candlestick</option>
              <option value="area">Area</option>
            </select>
          </div>
        </div>
      )}

      {/* Chart area - placeholder for now */}
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-lg mb-2">📈</div>
          <div className="text-sm font-medium">Chart Placeholder</div>
          <div className="text-xs mt-1">
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart for{' '}
            {symbol}
          </div>
          <div className="text-xs mt-1">
            Timeframe: {timeframe.toUpperCase()}
          </div>
          {historicalData && (
            <div className="text-xs mt-1">
              {historicalData.data.length} data points loaded
            </div>
          )}
        </div>
      </div>

      {/* Volume chart */}
      {showVolume && (
        <div className="mt-2 h-16 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Volume Chart
          </span>
        </div>
      )}

      {/* Technical indicators */}
      {showIndicators && config.indicators && config.indicators.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
            Technical Indicators:
          </div>
          <div className="flex flex-wrap gap-1">
            {config.indicators.map(indicator => (
              <span
                key={indicator}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
              >
                {indicator.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last updated indicator */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default PriceChartWidget;
