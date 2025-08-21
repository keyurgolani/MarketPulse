/**
 * Candlestick Chart Component
 * Displays OHLC (Open, High, Low, Close) data as candlesticks with color coding
 */

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import type { ChartOptions, ChartConfiguration } from 'chart.js';
import type { PricePoint } from '@/types/market';
import {
  calculateDynamicBounds,
  getDefaultChartOptions,
} from '@/utils/chartUtils';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, TimeScale, Title, Tooltip, Legend);

export interface CandlestickChartProps {
  /** OHLC data points */
  data: PricePoint[];
  /** Chart height in pixels */
  height?: number;
  /** Currency for price formatting */
  currency?: string;
  /** Theme for styling */
  theme?: 'light' | 'dark';
  /** Whether to show dynamic Y-axis bounds */
  dynamicBounds?: boolean;
  /** Y-axis padding percentage */
  padding?: number;
  /** Custom chart options */
  options?: Partial<ChartOptions>;
  /** Callback when chart is ready */
  onChartReady?: (chart: ChartJS) => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  height = 400,
  currency = 'USD',
  theme = 'light',
  dynamicBounds = true,
  padding = 0.1,
  options: customOptions = {},
  // onChartReady, // TODO: Implement chart ready callback
}) => {
  // Calculate dynamic bounds
  const bounds = useMemo(() => {
    if (!data || data.length === 0) {
      return { min: 0, max: 100, padding };
    }

    if (dynamicBounds) {
      return calculateDynamicBounds(data, padding);
    }

    return { min: 0, max: 100, padding };
  }, [data, dynamicBounds, padding]);

  // Prepare candlestick data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return { datasets: [] };
    }

    // Create candlestick data using bar chart with custom styling
    const candlestickData = data.map(point => {
      const isUp = point.close >= point.open;
      const bodyTop = Math.max(point.open, point.close);
      const bodyBottom = Math.min(point.open, point.close);
      const wickTop = point.high;
      const wickBottom = point.low;

      return {
        x: point.timestamp.getTime(),
        y: [wickBottom, bodyBottom, bodyTop, wickTop],
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        isUp,
        bodyTop,
        bodyBottom,
        wickTop,
        wickBottom,
      };
    });

    // Separate up and down candles for different colors
    const upCandles = candlestickData.filter(candle => candle.isUp);
    const downCandles = candlestickData.filter(candle => !candle.isUp);

    const upColor = theme === 'dark' ? '#10b981' : '#059669'; // green
    const downColor = theme === 'dark' ? '#ef4444' : '#dc2626'; // red
    const wickColor = theme === 'dark' ? '#6b7280' : '#4b5563'; // gray

    return {
      datasets: [
        // Up candles (green)
        {
          label: 'Price Up',
          data: upCandles.map(candle => ({
            x: candle.x,
            y: candle.bodyTop,
          })),
          backgroundColor: upColor,
          borderColor: upColor,
          borderWidth: 1,
          barThickness: 'flex',
          maxBarThickness: 8,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        },
        // Down candles (red)
        {
          label: 'Price Down',
          data: downCandles.map(candle => ({
            x: candle.x,
            y: candle.bodyTop,
          })),
          backgroundColor: downColor,
          borderColor: downColor,
          borderWidth: 1,
          barThickness: 'flex',
          maxBarThickness: 8,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        },
        // Wicks (high-low lines)
        {
          label: 'Wicks',
          data: candlestickData.map(candle => ({
            x: candle.x,
            y: candle.wickTop,
          })),
          type: 'line' as const,
          borderColor: wickColor,
          backgroundColor: 'transparent',
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          showLine: false,
          order: 3,
        },
      ],
    };
  }, [data, theme]);

  // Chart options
  const chartOptions: ChartOptions = useMemo(() => {
    const baseOptions = getDefaultChartOptions(bounds, currency);

    const candlestickOptions: ChartOptions = {
      ...baseOptions,
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          backgroundColor:
            theme === 'dark'
              ? 'rgba(0, 0, 0, 0.9)'
              : 'rgba(255, 255, 255, 0.9)',
          titleColor: theme === 'dark' ? 'white' : 'black',
          bodyColor: theme === 'dark' ? 'white' : 'black',
          borderColor:
            theme === 'dark'
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.2)',
          callbacks: {
            title: context => {
              if (context.length > 0) {
                const timestamp = context[0].parsed.x;
                return new Date(timestamp).toLocaleDateString();
              }
              return '';
            },
            label: context => {
              const dataIndex = context.dataIndex;
              if (dataIndex < data.length) {
                const point = data[dataIndex];
                return [
                  `Open: ${point.open.toFixed(2)}`,
                  `High: ${point.high.toFixed(2)}`,
                  `Low: ${point.low.toFixed(2)}`,
                  `Close: ${point.close.toFixed(2)}`,
                  `Volume: ${point.volume?.toLocaleString() || 'N/A'}`,
                ];
              }
              return '';
            },
          },
        },
        legend: {
          display: false, // Hide legend for cleaner look
        },
      },
      scales: {
        ...baseOptions.scales,
        x: {
          type: 'time' as const,
          time: {
            displayFormats: {
              hour: 'HH:mm',
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy',
            },
          },
          ticks: {
            color:
              theme === 'dark'
                ? 'rgba(156, 163, 175, 0.8)'
                : 'rgba(75, 85, 99, 0.8)',
          },
          grid: {
            color:
              theme === 'dark'
                ? 'rgba(156, 163, 175, 0.1)'
                : 'rgba(0, 0, 0, 0.1)',
          },
        },
        y: {
          min: bounds.min,
          max: bounds.max,
          position: 'right' as const,
          ticks: {
            color:
              theme === 'dark'
                ? 'rgba(156, 163, 175, 0.8)'
                : 'rgba(75, 85, 99, 0.8)',
            callback: function (value) {
              return `${currency === 'USD' ? '$' : ''}${Number(value).toFixed(2)}`;
            },
          },
          grid: {
            color:
              theme === 'dark'
                ? 'rgba(156, 163, 175, 0.1)'
                : 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
      ...customOptions,
    };

    return candlestickOptions;
  }, [bounds, currency, theme, customOptions, data]);

  // Chart configuration
  const chartConfig: ChartConfiguration = {
    type: 'bar',
    data: chartData,
    options: chartOptions,
  };

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <Chart
        {...chartConfig}
        options={{
          ...chartOptions,
          responsive: true,
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
};

export default CandlestickChart;
