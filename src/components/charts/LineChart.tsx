/**
 * Line Chart Component
 * Displays time series data with dynamic Y-axis scaling
 */

import React from 'react';
import { BaseChart, type BaseChartProps } from './BaseChart';
// import type { HistoricalDataPoint } from '@/types/market';
import {
  convertToLineChartData,
  getPriceChangeColor,
} from '@/utils/chartUtils';

export interface LineChartProps extends Omit<BaseChartProps, 'type'> {
  /** Field to display */
  field?: 'open' | 'high' | 'low' | 'close';
  /** Line color */
  color?: string;
  /** Whether to fill area under line */
  fill?: boolean;
  /** Line tension (0 = straight lines, 1 = very curved) */
  tension?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  field = 'close',
  color,
  fill = false,
  tension = 0.1,
  theme = 'light',
  ...props
}) => {
  // Determine line color based on price change if not specified
  const lineColor =
    color ||
    ((): string => {
      if (data.length < 2) {
        return theme === 'dark' ? '#3b82f6' : '#2563eb';
      }

      const firstPrice = data[0][field];
      const lastPrice = data[data.length - 1][field];
      return getPriceChangeColor(lastPrice, firstPrice, theme);
    })();

  // Custom chart configuration for line chart
  const customConfig = {
    data: {
      datasets: [
        {
          data: convertToLineChartData(data, field),
          borderColor: lineColor,
          backgroundColor: fill
            ? `${lineColor}20` // Add transparency
            : 'transparent',
          borderWidth: 2,
          fill,
          tension,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: lineColor,
          pointHoverBorderColor: theme === 'dark' ? '#ffffff' : '#000000',
          pointHoverBorderWidth: 2,
        },
      ],
    },
  };

  return (
    <BaseChart
      {...props}
      data={data}
      type="line"
      theme={theme}
      config={customConfig}
    />
  );
};

export default LineChart;
