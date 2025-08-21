/**
 * Chart Utilities
 * Helper functions for chart configuration and data processing
 */

import type { ChartOptions } from 'chart.js';
import type { PricePoint } from '@/types/market';

export interface ChartBounds {
  min: number;
  max: number;
  padding: number;
}

/**
 * Calculate dynamic Y-axis bounds based on visible data
 */
export function calculateDynamicBounds(
  data: PricePoint[],
  padding: number = 0.1
): ChartBounds {
  if (!data || data.length === 0) {
    return { min: 0, max: 100, padding };
  }

  // Extract all price values (high, low, open, close)
  const values: number[] = [];
  data.forEach(point => {
    values.push(point.high, point.low, point.open, point.close);
  });

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const paddingAmount = range * padding;

  return {
    min: Math.max(0, min - paddingAmount),
    max: max + paddingAmount,
    padding,
  };
}

/**
 * Calculate dynamic bounds for a specific data range
 */
export function calculateBoundsForRange(
  data: PricePoint[],
  startIndex: number,
  endIndex: number,
  padding: number = 0.1
): ChartBounds {
  const rangeData = data.slice(startIndex, endIndex + 1);
  return calculateDynamicBounds(rangeData, padding);
}

/**
 * Format price for chart display
 */
export function formatChartPrice(
  value: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format volume for chart display
 */
export function formatChartVolume(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Get default chart options with dynamic Y-axis
 */
export function getDefaultChartOptions(
  bounds: ChartBounds,
  currency: string = 'USD'
): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: (context): string => {
            const value = context.parsed.y;
            return formatChartPrice(value, currency);
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)',
        },
      },
      y: {
        min: bounds.min,
        max: bounds.max,
        position: 'right',
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)',
          callback: function (value): string {
            return formatChartPrice(value as number, currency);
          },
        },
      },
    },
  };
}

/**
 * Get candlestick chart options
 */
export function getCandlestickChartOptions(
  bounds: ChartBounds,
  currency: string = 'USD'
): ChartOptions {
  const baseOptions = getDefaultChartOptions(bounds, currency);

  return {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      tooltip: {
        ...baseOptions.plugins?.tooltip,
        callbacks: {
          title: (context): string => {
            return new Date(context[0].parsed.x).toLocaleDateString();
          },
          label: (context): string[] => {
            const data = context.raw as {
              o: number;
              h: number;
              l: number;
              c: number;
            };
            return [
              `Open: ${formatChartPrice(data.o, currency)}`,
              `High: ${formatChartPrice(data.h, currency)}`,
              `Low: ${formatChartPrice(data.l, currency)}`,
              `Close: ${formatChartPrice(data.c, currency)}`,
            ];
          },
        },
      },
    },
  };
}

/**
 * Convert historical data to Chart.js line chart format
 */
export function convertToLineChartData(
  data: PricePoint[],
  field: 'open' | 'high' | 'low' | 'close' = 'close'
): Array<{ x: number; y: number }> {
  return data.map(point => ({
    x: point.timestamp.getTime(),
    y: point[field],
  }));
}

/**
 * Convert historical data to Chart.js candlestick format
 */
export function convertToCandlestickData(
  data: PricePoint[]
): Array<{ x: number; o: number; h: number; l: number; c: number }> {
  return data.map(point => ({
    x: point.timestamp.getTime(),
    o: point.open,
    h: point.high,
    l: point.low,
    c: point.close,
  }));
}

/**
 * Convert volume data to Chart.js format
 */
export function convertToVolumeData(
  data: PricePoint[]
): Array<{ x: number; y: number }> {
  return data.map(point => ({
    x: point.timestamp.getTime(),
    y: point.volume || 0,
  }));
}

/**
 * Get color based on price change
 */
export function getPriceChangeColor(
  current: number,
  previous: number,
  theme: 'light' | 'dark' = 'light'
): string {
  const isPositive = current >= previous;

  if (theme === 'dark') {
    return isPositive ? '#10b981' : '#ef4444'; // green-500, red-500
  }

  return isPositive ? '#059669' : '#dc2626'; // green-600, red-600
}

/**
 * Decimate data for performance optimization
 */
export function decimateData<T>(data: T[], maxPoints: number = 1000): T[] {
  if (data.length <= maxPoints) {
    return data;
  }

  const step = Math.ceil(data.length / maxPoints);
  const decimated: T[] = [];

  for (let i = 0; i < data.length; i += step) {
    decimated.push(data[i]);
  }

  // Always include the last point
  if (decimated[decimated.length - 1] !== data[data.length - 1]) {
    decimated.push(data[data.length - 1]);
  }

  return decimated;
}
