/**
 * Heatmap Widget Component
 * Displays sector/stock performance visualization
 */

import React, { useEffect, useState, useCallback } from 'react';
// import { marketDataService } from '@/services/marketDataService';
import { Loading } from '@/components/ui/Loading';
import type { Widget } from '@/types/widget';
// import type { Asset } from '@/types/market';
import { formatPercentage } from '@/types/market';

export interface HeatmapWidgetProps {
  /** Widget configuration */
  widget: Widget;
  /** Whether widget is in edit mode */
  isEditing?: boolean;
  /** Callback when widget needs update */
  onUpdate?: (updates: Partial<Widget>) => void;
  /** Optional className */
  className?: string;
}

interface HeatmapItem {
  symbol: string;
  name: string;
  changePercent: number;
  marketCap?: number;
  sector?: string;
}

interface Sector {
  name: string;
  changePercent: number;
  items: HeatmapItem[];
}

const MOCK_SECTORS: Sector[] = [
  {
    name: 'Technology',
    changePercent: 2.45,
    items: [
      {
        symbol: 'AAPL',
        name: 'Apple',
        changePercent: 3.2,
        marketCap: 2800000000000,
        sector: 'Technology',
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft',
        changePercent: 2.8,
        marketCap: 2400000000000,
        sector: 'Technology',
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet',
        changePercent: 1.9,
        marketCap: 1600000000000,
        sector: 'Technology',
      },
      {
        symbol: 'META',
        name: 'Meta',
        changePercent: 4.1,
        marketCap: 800000000000,
        sector: 'Technology',
      },
      {
        symbol: 'NVDA',
        name: 'NVIDIA',
        changePercent: 5.7,
        marketCap: 1200000000000,
        sector: 'Technology',
      },
      {
        symbol: 'TSLA',
        name: 'Tesla',
        changePercent: -2.3,
        marketCap: 600000000000,
        sector: 'Technology',
      },
    ],
  },
  {
    name: 'Healthcare',
    changePercent: 0.85,
    items: [
      {
        symbol: 'JNJ',
        name: 'Johnson & Johnson',
        changePercent: 1.2,
        marketCap: 450000000000,
        sector: 'Healthcare',
      },
      {
        symbol: 'PFE',
        name: 'Pfizer',
        changePercent: -0.8,
        marketCap: 280000000000,
        sector: 'Healthcare',
      },
      {
        symbol: 'UNH',
        name: 'UnitedHealth',
        changePercent: 2.1,
        marketCap: 520000000000,
        sector: 'Healthcare',
      },
      {
        symbol: 'ABBV',
        name: 'AbbVie',
        changePercent: 0.9,
        marketCap: 300000000000,
        sector: 'Healthcare',
      },
    ],
  },
  {
    name: 'Financial',
    changePercent: -0.65,
    items: [
      {
        symbol: 'JPM',
        name: 'JPMorgan Chase',
        changePercent: -1.2,
        marketCap: 480000000000,
        sector: 'Financial',
      },
      {
        symbol: 'BAC',
        name: 'Bank of America',
        changePercent: -0.9,
        marketCap: 320000000000,
        sector: 'Financial',
      },
      {
        symbol: 'WFC',
        name: 'Wells Fargo',
        changePercent: -0.3,
        marketCap: 180000000000,
        sector: 'Financial',
      },
      {
        symbol: 'GS',
        name: 'Goldman Sachs',
        changePercent: -1.8,
        marketCap: 120000000000,
        sector: 'Financial',
      },
    ],
  },
  {
    name: 'Energy',
    changePercent: -1.25,
    items: [
      {
        symbol: 'XOM',
        name: 'Exxon Mobil',
        changePercent: -1.5,
        marketCap: 420000000000,
        sector: 'Energy',
      },
      {
        symbol: 'CVX',
        name: 'Chevron',
        changePercent: -0.8,
        marketCap: 320000000000,
        sector: 'Energy',
      },
      {
        symbol: 'COP',
        name: 'ConocoPhillips',
        changePercent: -2.1,
        marketCap: 150000000000,
        sector: 'Energy',
      },
    ],
  },
];

export const HeatmapWidget: React.FC<HeatmapWidgetProps> = ({
  widget,
  isEditing = false,
  // onUpdate, // TODO: Implement widget updates
  className = '',
}) => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract configuration
  const config = widget.config;
  const refreshInterval = config.refreshInterval || 300000; // 5 minutes
  // const customSettings = (config.customSettings || {}) as Record<string, unknown>; // TODO: Use for configuration
  // const viewMode = (customSettings.viewMode as string) || 'sectors'; // 'sectors' or 'stocks' // TODO: Implement view mode switching

  // Load heatmap data
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // TODO: Replace with actual API call
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      setSectors(MOCK_SECTORS);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load heatmap data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Get color based on performance
  const getPerformanceColor = useCallback((changePercent: number): string => {
    const intensity = Math.min(Math.abs(changePercent) / 5, 1); // Max intensity at 5%

    if (changePercent > 0) {
      // Green for positive
      const opacity = Math.max(0.1, intensity);
      return `rgba(34, 197, 94, ${opacity})`;
    } else if (changePercent < 0) {
      // Red for negative
      const opacity = Math.max(0.1, intensity);
      return `rgba(239, 68, 68, ${opacity})`;
    } else {
      // Gray for neutral
      return 'rgba(156, 163, 175, 0.1)';
    }
  }, []);

  // Get text color based on performance
  const getTextColor = useCallback((changePercent: number): string => {
    if (changePercent > 0) return 'text-green-800 dark:text-green-200';
    if (changePercent < 0) return 'text-red-800 dark:text-red-200';
    return 'text-gray-800 dark:text-gray-200';
  }, []);

  // Calculate item size based on market cap
  const getItemSize = useCallback((marketCap?: number): string => {
    if (!marketCap) return 'h-16 w-32';

    if (marketCap > 1000000000000) return 'h-24 w-48'; // > 1T
    if (marketCap > 500000000000) return 'h-20 w-40'; // > 500B
    if (marketCap > 100000000000) return 'h-16 w-32'; // > 100B
    return 'h-12 w-24'; // < 100B
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className={`heatmap-widget ${className}`}>
        <div className="flex items-center justify-center h-64">
          <Loading text="Loading heatmap..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`heatmap-widget ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 text-red-600 dark:text-red-400">
          <div className="text-sm font-medium">Failed to load heatmap</div>
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
    <div className={`heatmap-widget ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Market Heatmap
        </h3>

        {/* View mode selector */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedSector(null)}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              !selectedSector
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All Sectors
          </button>
          {selectedSector && (
            <button
              onClick={() => setSelectedSector(null)}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Heatmap visualization */}
      <div className="space-y-4">
        {!selectedSector ? (
          // Sector overview
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sectors.map(sector => (
              <div
                key={sector.name}
                onClick={() => setSelectedSector(sector.name)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedSector(sector.name);
                  }
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                style={{
                  backgroundColor: getPerformanceColor(sector.changePercent),
                }}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {sector.name}
                </div>
                <div
                  className={`text-lg font-bold mt-1 ${getTextColor(sector.changePercent)}`}
                >
                  {formatPercentage(sector.changePercent)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {sector.items.length} stocks
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Individual stocks in selected sector
          ((): React.ReactElement | null => {
            const sector = sectors.find(s => s.name === selectedSector);
            if (!sector) return null;

            return (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                  {sector.name} Sector ({formatPercentage(sector.changePercent)}
                  )
                </h4>
                <div className="flex flex-wrap gap-2">
                  {sector.items.map(item => (
                    <div
                      key={item.symbol}
                      className={`${getItemSize(item.marketCap)} p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-between transition-all hover:scale-105`}
                      style={{
                        backgroundColor: getPerformanceColor(
                          item.changePercent
                        ),
                      }}
                    >
                      <div>
                        <div className="font-bold text-sm text-gray-900 dark:text-white">
                          {item.symbol}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {item.name}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-bold ${getTextColor(item.changePercent)}`}
                      >
                        {formatPercentage(item.changePercent)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: getPerformanceColor(3) }}
          ></div>
          <span>Strong Gain</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: getPerformanceColor(1) }}
          ></div>
          <span>Gain</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: getPerformanceColor(0) }}
          ></div>
          <span>Neutral</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: getPerformanceColor(-1) }}
          ></div>
          <span>Loss</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: getPerformanceColor(-3) }}
          ></div>
          <span>Strong Loss</span>
        </div>
      </div>

      {/* Last updated indicator */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default HeatmapWidget;
