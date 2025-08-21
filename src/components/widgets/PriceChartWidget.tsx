/**
 * Price Chart Widget Component
 * Displays interactive price charts with technical indicators and dynamic Y-axis bounds
 */

import React, { useEffect, useState, useCallback } from 'react';
import { marketDataService } from '@/services/marketDataService';
import { Loading } from '@/components/ui/Loading';
import { LineChart } from '@/components/charts/LineChart';
import { CandlestickChart } from '@/components/charts/CandlestickChart';
import { VolumeChart } from '@/components/charts/VolumeChart';
import type { Widget, TimeFrame } from '@/types/widget';
import type { Asset, HistoricalData } from '@/types/market';
import type { TechnicalIndicatorType } from '@/utils/technicalIndicators';
import {
  calculateIndicator,
  getIndicatorConfig,
} from '@/utils/technicalIndicators';
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
  const indicators =
    (config.indicators as string[])?.filter(
      (ind): ind is TechnicalIndicatorType =>
        [
          'SMA_10',
          'SMA_20',
          'SMA_50',
          'EMA_12',
          'EMA_26',
          'RSI',
          'MACD',
          'BOLLINGER',
        ].includes(ind)
    ) || [];
  const dynamicBounds = (customSettings.dynamicBounds as boolean) ?? true;

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

      {/* Chart area */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg">
        {historicalData && historicalData.data.length > 0 ? (
          <div className="p-4">
            {/* Main price chart */}
            <div className="mb-4">
              {chartType === 'candlestick' ? (
                <CandlestickChart
                  data={historicalData.data}
                  height={height}
                  currency={asset?.currency}
                  theme={
                    document.documentElement.classList.contains('dark')
                      ? 'dark'
                      : 'light'
                  }
                  dynamicBounds={dynamicBounds}
                />
              ) : (
                <LineChart
                  data={historicalData.data}
                  height={height}
                  currency={asset?.currency}
                  theme={
                    document.documentElement.classList.contains('dark')
                      ? 'dark'
                      : 'light'
                  }
                  dynamicBounds={dynamicBounds}
                  fill={chartType === 'area'}
                />
              )}
            </div>

            {/* Technical indicators overlay */}
            {showIndicators && indicators.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Technical Indicators
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                  {indicators.map(indicator => {
                    const config = getIndicatorConfig(indicator);
                    const indicatorData = calculateIndicator(
                      historicalData.data,
                      indicator
                    );
                    const latestValue = indicatorData[indicatorData.length - 1];

                    let displayValue = 'N/A';
                    if (latestValue) {
                      if (
                        'value' in latestValue &&
                        latestValue.value !== null
                      ) {
                        displayValue = latestValue.value.toFixed(2);
                      } else if (
                        'macd' in latestValue &&
                        latestValue.macd !== null
                      ) {
                        displayValue = latestValue.macd.toFixed(3);
                      } else if (
                        'middle' in latestValue &&
                        latestValue.middle !== null
                      ) {
                        displayValue = latestValue.middle.toFixed(2);
                      }
                    }

                    return (
                      <div
                        key={indicator}
                        className="flex items-center space-x-2 p-2 bg-white dark:bg-gray-600 rounded"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <div>
                          <div className="font-medium">{config.name}</div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {displayValue}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ height: `${height}px` }}
          >
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-lg mb-2">📈</div>
              <div className="text-sm font-medium">No chart data available</div>
              <div className="text-xs mt-1">
                {symbol
                  ? `No data for ${symbol}`
                  : 'Select an asset to view chart'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Volume chart */}
      {showVolume && historicalData && historicalData.data.length > 0 && (
        <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Volume
          </div>
          <VolumeChart
            data={historicalData.data}
            height={80}
            theme={
              document.documentElement.classList.contains('dark')
                ? 'dark'
                : 'light'
            }
          />
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
