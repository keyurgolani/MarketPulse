/**
 * Base Chart Component
 * Provides common chart functionality with dynamic Y-axis bounds
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import type { ChartOptions, ChartConfiguration } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import type { PricePoint } from '@/types/market';
import {
  calculateDynamicBounds,
  getDefaultChartOptions,
} from '@/utils/chartUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export interface BaseChartProps {
  /** Chart data */
  data: PricePoint[];
  /** Chart type */
  type: 'line' | 'bar';
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
  /** Chart configuration */
  config?: Partial<ChartConfiguration>;
  /** Callback when chart is ready */
  onChartReady?: (chart: ChartJS) => void;
  /** Callback when data range changes (for zoom/pan) */
  onRangeChange?: (startIndex: number, endIndex: number) => void;
}

export const BaseChart: React.FC<BaseChartProps> = ({
  data,
  type,
  height = 400,
  currency = 'USD',
  theme = 'light',
  dynamicBounds = true,
  padding = 0.1,
  options: customOptions = {},
  config: customConfig = {},
  onChartReady,
  // onRangeChange, // TODO: Implement zoom/pan functionality
}) => {
  const chartRef = useRef<ChartJS>(null);
  const [chartOptions, setChartOptions] = useState<ChartOptions>({});

  // Calculate dynamic bounds and update chart options
  const updateChartOptions = useCallback(() => {
    if (!data || data.length === 0) {
      return;
    }

    const bounds = dynamicBounds
      ? calculateDynamicBounds(data, padding)
      : { min: 0, max: 100, padding };

    const baseOptions = getDefaultChartOptions(bounds, currency);

    // Apply theme-specific styling
    const themeOptions: Partial<ChartOptions> = {
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
        },
      },
      scales: {
        ...baseOptions.scales,
        x: {
          ...baseOptions.scales?.x,
          ticks: {
            ...baseOptions.scales?.x?.ticks,
            color:
              theme === 'dark'
                ? 'rgba(156, 163, 175, 0.8)'
                : 'rgba(75, 85, 99, 0.8)',
          },
          grid: {
            ...baseOptions.scales?.x?.grid,
            color:
              theme === 'dark'
                ? 'rgba(156, 163, 175, 0.1)'
                : 'rgba(0, 0, 0, 0.1)',
          },
        },
        y: {
          ...baseOptions.scales?.y,
          ticks: {
            ...baseOptions.scales?.y?.ticks,
            color:
              theme === 'dark'
                ? 'rgba(156, 163, 175, 0.8)'
                : 'rgba(75, 85, 99, 0.8)',
          },
          grid: {
            ...baseOptions.scales?.y?.grid,
            color:
              theme === 'dark'
                ? 'rgba(156, 163, 175, 0.1)'
                : 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
    };

    // Merge all options
    const finalOptions: ChartOptions = {
      ...baseOptions,
      ...themeOptions,
      ...customOptions,
      plugins: {
        ...baseOptions.plugins,
        ...themeOptions.plugins,
        ...customOptions.plugins,
      },
      scales: {
        ...baseOptions.scales,
        ...themeOptions.scales,
        ...customOptions.scales,
      },
    };

    setChartOptions(finalOptions);
  }, [data, currency, theme, dynamicBounds, padding, customOptions]);

  // Update options when dependencies change
  useEffect(() => {
    updateChartOptions();
  }, [updateChartOptions]);

  // Handle chart ready callback
  useEffect(() => {
    if (chartRef.current && onChartReady) {
      onChartReady(chartRef.current);
    }
  }, [onChartReady]);

  // Prepare chart data
  const chartData = {
    datasets: [
      {
        data: data.map(point => ({
          x: point.timestamp.getTime(),
          y: point.close,
        })),
        borderColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
        backgroundColor:
          type === 'line'
            ? 'transparent'
            : theme === 'dark'
              ? 'rgba(59, 130, 246, 0.1)'
              : 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        fill: type === 'line' ? false : true,
        tension: type === 'line' ? 0.1 : 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
        pointHoverBorderColor: theme === 'dark' ? '#ffffff' : '#000000',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  // Chart configuration
  const chartConfig: ChartConfiguration = {
    type,
    data: chartData,
    options: chartOptions,
    ...customConfig,
  };

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <Chart
        ref={chartRef}
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

export default BaseChart;
