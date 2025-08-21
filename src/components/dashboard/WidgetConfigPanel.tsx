/**
 * Widget Configuration Panel Component
 * Provides detailed configuration options for dashboard widgets
 */

import React, { useState, useCallback } from 'react';
import type { Widget, WidgetType, WidgetConfig } from '@/types/widget';
import { Button } from '@/components/ui/Button';

export interface WidgetConfigPanelProps {
  /** Widget to configure */
  widget: Widget;
  /** Callback when widget is updated */
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  /** Callback when panel is closed */
  onClose: () => void;
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'color';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Widget configuration schemas by type
 */
const WIDGET_CONFIG_SCHEMAS: Record<WidgetType, ConfigField[]> = {
  'asset-list': [
    {
      key: 'symbols',
      label: 'Asset Symbols',
      type: 'text',
      placeholder: 'AAPL,GOOGL,MSFT',
    },
    { key: 'showChange', label: 'Show Price Change', type: 'boolean' },
    { key: 'showVolume', label: 'Show Volume', type: 'boolean' },
    {
      key: 'sortBy',
      label: 'Sort By',
      type: 'select',
      options: [
        { value: 'symbol', label: 'Symbol' },
        { value: 'price', label: 'Price' },
        { value: 'change', label: 'Change' },
        { value: 'volume', label: 'Volume' },
      ],
    },
    {
      key: 'refreshInterval',
      label: 'Refresh Interval (seconds)',
      type: 'number',
      min: 5,
      max: 300,
      step: 5,
    },
  ],
  'asset-grid': [
    {
      key: 'symbols',
      label: 'Asset Symbols',
      type: 'text',
      placeholder: 'AAPL,GOOGL,MSFT',
    },
    {
      key: 'columns',
      label: 'Columns',
      type: 'number',
      min: 1,
      max: 6,
      step: 1,
    },
    { key: 'showLogos', label: 'Show Company Logos', type: 'boolean' },
    { key: 'showMetrics', label: 'Show Key Metrics', type: 'boolean' },
    {
      key: 'colorScheme',
      label: 'Color Scheme',
      type: 'select',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'green-red', label: 'Green/Red' },
        { value: 'blue-orange', label: 'Blue/Orange' },
      ],
    },
  ],
  'price-chart': [
    { key: 'symbol', label: 'Asset Symbol', type: 'text', placeholder: 'AAPL' },
    {
      key: 'timeframe',
      label: 'Timeframe',
      type: 'select',
      options: [
        { value: '1D', label: '1 Day' },
        { value: '5D', label: '5 Days' },
        { value: '1M', label: '1 Month' },
        { value: '3M', label: '3 Months' },
        { value: '6M', label: '6 Months' },
        { value: '1Y', label: '1 Year' },
        { value: '5Y', label: '5 Years' },
      ],
    },
    {
      key: 'chartType',
      label: 'Chart Type',
      type: 'select',
      options: [
        { value: 'line', label: 'Line' },
        { value: 'candlestick', label: 'Candlestick' },
        { value: 'area', label: 'Area' },
      ],
    },
    { key: 'showVolume', label: 'Show Volume', type: 'boolean' },
    {
      key: 'showIndicators',
      label: 'Show Technical Indicators',
      type: 'boolean',
    },
    {
      key: 'indicators',
      label: 'Technical Indicators',
      type: 'multiselect',
      options: [
        { value: 'SMA_10', label: 'SMA (10)' },
        { value: 'SMA_20', label: 'SMA (20)' },
        { value: 'SMA_50', label: 'SMA (50)' },
        { value: 'EMA_12', label: 'EMA (12)' },
        { value: 'EMA_26', label: 'EMA (26)' },
        { value: 'RSI', label: 'RSI (14)' },
        { value: 'MACD', label: 'MACD' },
        { value: 'BOLLINGER', label: 'Bollinger Bands' },
      ],
    },
    { key: 'dynamicBounds', label: 'Dynamic Y-Axis', type: 'boolean' },
  ],
  'news-feed': [
    {
      key: 'sources',
      label: 'News Sources',
      type: 'multiselect',
      options: [
        { value: 'reuters', label: 'Reuters' },
        { value: 'bloomberg', label: 'Bloomberg' },
        { value: 'cnbc', label: 'CNBC' },
        { value: 'marketwatch', label: 'MarketWatch' },
        { value: 'yahoo', label: 'Yahoo Finance' },
      ],
    },
    {
      key: 'maxArticles',
      label: 'Max Articles',
      type: 'number',
      min: 5,
      max: 50,
      step: 5,
    },
    { key: 'showImages', label: 'Show Images', type: 'boolean' },
    { key: 'showSummary', label: 'Show Summary', type: 'boolean' },
    { key: 'autoRefresh', label: 'Auto Refresh', type: 'boolean' },
  ],
  'market-summary': [
    {
      key: 'indices',
      label: 'Market Indices',
      type: 'multiselect',
      options: [
        { value: 'SPY', label: 'S&P 500 (SPY)' },
        { value: 'QQQ', label: 'NASDAQ (QQQ)' },
        { value: 'DIA', label: 'Dow Jones (DIA)' },
        { value: 'IWM', label: 'Russell 2000 (IWM)' },
        { value: 'VTI', label: 'Total Market (VTI)' },
      ],
    },
    { key: 'showPreMarket', label: 'Show Pre-Market', type: 'boolean' },
    { key: 'showAfterHours', label: 'Show After Hours', type: 'boolean' },
    { key: 'showHeatmap', label: 'Show Heatmap', type: 'boolean' },
  ],
  heatmap: [
    {
      key: 'viewMode',
      label: 'View Mode',
      type: 'select',
      options: [
        { value: 'sectors', label: 'Sectors' },
        { value: 'stocks', label: 'Individual Stocks' },
        { value: 'etfs', label: 'ETFs' },
      ],
    },
    {
      key: 'colorScheme',
      label: 'Color Scheme',
      type: 'select',
      options: [
        { value: 'red-green', label: 'Red/Green' },
        { value: 'blue-orange', label: 'Blue/Orange' },
        { value: 'monochrome', label: 'Monochrome' },
      ],
    },
    { key: 'showLabels', label: 'Show Labels', type: 'boolean' },
    { key: 'showPercentages', label: 'Show Percentages', type: 'boolean' },
  ],
  watchlist: [
    {
      key: 'name',
      label: 'Watchlist Name',
      type: 'text',
      placeholder: 'My Watchlist',
    },
    {
      key: 'symbols',
      label: 'Asset Symbols',
      type: 'text',
      placeholder: 'AAPL,GOOGL,MSFT',
    },
    { key: 'showAlerts', label: 'Show Price Alerts', type: 'boolean' },
    { key: 'showNews', label: 'Show Related News', type: 'boolean' },
    {
      key: 'sortBy',
      label: 'Sort By',
      type: 'select',
      options: [
        { value: 'symbol', label: 'Symbol' },
        { value: 'price', label: 'Price' },
        { value: 'change', label: 'Change %' },
        { value: 'volume', label: 'Volume' },
      ],
    },
  ],
  portfolio: [
    {
      key: 'accountId',
      label: 'Account ID',
      type: 'text',
      placeholder: 'Optional account ID',
    },
    { key: 'showTotalValue', label: 'Show Total Value', type: 'boolean' },
    { key: 'showDayChange', label: 'Show Day Change', type: 'boolean' },
    { key: 'showAllocation', label: 'Show Asset Allocation', type: 'boolean' },
    {
      key: 'showPerformance',
      label: 'Show Performance Chart',
      type: 'boolean',
    },
  ],
  'economic-calendar': [
    {
      key: 'importance',
      label: 'Event Importance',
      type: 'multiselect',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
    },
    {
      key: 'countries',
      label: 'Countries',
      type: 'multiselect',
      options: [
        { value: 'US', label: 'United States' },
        { value: 'EU', label: 'European Union' },
        { value: 'GB', label: 'United Kingdom' },
        { value: 'JP', label: 'Japan' },
        { value: 'CN', label: 'China' },
      ],
    },
    {
      key: 'daysAhead',
      label: 'Days Ahead',
      type: 'number',
      min: 1,
      max: 30,
      step: 1,
    },
    { key: 'showPast', label: 'Show Past Events', type: 'boolean' },
  ],
  screener: [
    {
      key: 'market',
      label: 'Market',
      type: 'select',
      options: [
        { value: 'stocks', label: 'Stocks' },
        { value: 'etf', label: 'ETFs' },
        { value: 'crypto', label: 'Cryptocurrency' },
        { value: 'forex', label: 'Forex' },
      ],
    },
    {
      key: 'filters',
      label: 'Default Filters',
      type: 'text',
      placeholder: 'market_cap>1B,volume>1M',
    },
    {
      key: 'columns',
      label: 'Visible Columns',
      type: 'multiselect',
      options: [
        { value: 'symbol', label: 'Symbol' },
        { value: 'price', label: 'Price' },
        { value: 'change', label: 'Change' },
        { value: 'volume', label: 'Volume' },
        { value: 'market_cap', label: 'Market Cap' },
        { value: 'pe_ratio', label: 'P/E Ratio' },
      ],
    },
    {
      key: 'maxResults',
      label: 'Max Results',
      type: 'number',
      min: 10,
      max: 100,
      step: 10,
    },
  ],
  alerts: [
    { key: 'showActive', label: 'Show Active Alerts', type: 'boolean' },
    { key: 'showTriggered', label: 'Show Triggered Alerts', type: 'boolean' },
    {
      key: 'maxAlerts',
      label: 'Max Alerts to Display',
      type: 'number',
      min: 5,
      max: 50,
      step: 5,
    },
    {
      key: 'groupBy',
      label: 'Group By',
      type: 'select',
      options: [
        { value: 'symbol', label: 'Symbol' },
        { value: 'type', label: 'Alert Type' },
        { value: 'status', label: 'Status' },
      ],
    },
  ],
  performance: [
    {
      key: 'timeframe',
      label: 'Timeframe',
      type: 'select',
      options: [
        { value: '1D', label: '1 Day' },
        { value: '1W', label: '1 Week' },
        { value: '1M', label: '1 Month' },
        { value: '3M', label: '3 Months' },
        { value: '6M', label: '6 Months' },
        { value: '1Y', label: '1 Year' },
      ],
    },
    { key: 'benchmark', label: 'Benchmark', type: 'text', placeholder: 'SPY' },
    { key: 'showReturns', label: 'Show Returns', type: 'boolean' },
    { key: 'showVolatility', label: 'Show Volatility', type: 'boolean' },
    { key: 'showSharpe', label: 'Show Sharpe Ratio', type: 'boolean' },
  ],
  custom: [
    {
      key: 'title',
      label: 'Custom Title',
      type: 'text',
      placeholder: 'Custom Widget',
    },
    {
      key: 'content',
      label: 'Content',
      type: 'text',
      placeholder: 'Custom content or HTML',
    },
    { key: 'backgroundColor', label: 'Background Color', type: 'color' },
    { key: 'textColor', label: 'Text Color', type: 'color' },
  ],
};

export const WidgetConfigPanel: React.FC<WidgetConfigPanelProps> = ({
  widget,
  onUpdate,
  onClose,
}) => {
  const [config, setConfig] = useState<WidgetConfig>(widget.config || {});

  /**
   * Get configuration schema for widget type
   */
  const getConfigSchema = useCallback((): ConfigField[] => {
    return WIDGET_CONFIG_SCHEMAS[widget.type] || [];
  }, [widget.type]);

  /**
   * Handle configuration field change
   */
  const handleConfigChange = useCallback(
    (key: string, value: unknown): void => {
      const newConfig = { ...config, [key]: value };
      setConfig(newConfig);
      onUpdate(widget.id, { config: newConfig });
    },
    [config, widget.id, onUpdate]
  );

  /**
   * Render configuration field
   */
  const renderConfigField = useCallback(
    (field: ConfigField): React.ReactNode => {
      const value = config[field.key as keyof WidgetConfig];

      switch (field.type) {
        case 'text':
          return (
            <input
              type="text"
              value={(value as string) || ''}
              onChange={e => handleConfigChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          );

        case 'number':
          return (
            <input
              type="number"
              value={(value as number) || ''}
              onChange={e =>
                handleConfigChange(field.key, parseFloat(e.target.value) || 0)
              }
              min={field.min}
              max={field.max}
              step={field.step}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          );

        case 'boolean':
          return (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={Boolean(value) || false}
                onChange={e => handleConfigChange(field.key, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enabled
              </span>
            </label>
          );

        case 'select':
          return (
            <select
              value={(value as string) || ''}
              onChange={e => handleConfigChange(field.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Select...</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );

        case 'multiselect': {
          const selectedValues = (value as string[]) || [];
          return (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {field.options?.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={e => {
                      const newValues = e.target.checked
                        ? [...selectedValues, option.value]
                        : selectedValues.filter(v => v !== option.value);
                      handleConfigChange(field.key, newValues);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          );
        }

        case 'color':
          return (
            <input
              type="color"
              value={(value as string) || '#000000'}
              onChange={e => handleConfigChange(field.key, e.target.value)}
              className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md"
            />
          );

        default:
          return null;
      }
    },
    [config, handleConfigChange]
  );

  const configSchema = getConfigSchema();

  return (
    <div className="widget-config-panel bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Configure Widget
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {widget.title} ({widget.type})
        </p>
      </div>

      {/* Panel Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {configSchema.length > 0 ? (
          <div className="space-y-4">
            {configSchema.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label}
                </label>
                {renderConfigField(field)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No configuration options available for this widget type.</p>
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-end space-x-2">
          <Button onClick={onClose} variant="secondary" size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WidgetConfigPanel;
