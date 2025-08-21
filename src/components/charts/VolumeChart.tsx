/**
 * Volume Chart Component
 * Displays trading volume data as bar chart
 */

import React from 'react';
import { BaseChart, type BaseChartProps } from './BaseChart';
// import type { HistoricalDataPoint } from '@/types/market';
import { convertToVolumeData, formatChartVolume } from '@/utils/chartUtils';

export interface VolumeChartProps
  extends Omit<BaseChartProps, 'type' | 'dynamicBounds'> {
  /** Volume bar colors */
  colors?: {
    positive: string;
    negative: string;
  };
}

export const VolumeChart: React.FC<VolumeChartProps> = ({
  data,
  height = 100,
  theme = 'light',
  colors,
  ...props
}) => {
  // Default colors based on theme
  const defaultColors = {
    positive: theme === 'dark' ? '#10b981' : '#059669', // green
    negative: theme === 'dark' ? '#ef4444' : '#dc2626', // red
  };

  const volumeColors = colors || defaultColors;

  // Custom chart configuration for volume chart
  const customConfig = {
    data: {
      datasets: [
        {
          data: convertToVolumeData(data),
          backgroundColor: (ctx: { dataIndex: number }): string => {
            const index = ctx.dataIndex;
            if (index === 0) return volumeColors.positive;

            const current = data[index];
            const previous = data[index - 1];

            return current.close >= previous.close
              ? volumeColors.positive
              : volumeColors.negative;
          },
          borderColor: 'transparent',
          borderWidth: 0,
        },
      ],
    },
  };

  // Custom options for volume chart
  const customOptions = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number } }): string => {
            const value = context.parsed.y;
            return `Volume: ${formatChartVolume(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: number | string): string {
            return formatChartVolume(value as number);
          },
        },
      },
    },
  };

  return (
    <BaseChart
      {...props}
      data={data}
      type="bar"
      height={height}
      theme={theme}
      dynamicBounds={false} // Volume should start from 0
      config={customConfig}
      options={customOptions}
    />
  );
};

export default VolumeChart;
