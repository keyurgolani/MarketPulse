/**
 * Widget Container Component
 * Wrapper for individual widgets with drag/drop and resize capabilities
 */

import React, { useCallback } from 'react';
import type { Widget } from '@/types/widget';
import type { Dashboard } from '@/types/dashboard';

export interface WidgetContainerProps {
  /** Widget to render */
  widget: Widget;
  /** Dashboard containing the widget */
  dashboard: Dashboard;
  /** Whether widget is editable */
  editable?: boolean;
  /** Whether widget can be resized */
  resizable?: boolean;
  /** Whether widget can be dragged */
  draggable?: boolean;
  /** Callback when widget position changes */
  onPositionChange?: (position: {
    x: number;
    y: number;
    w: number;
    h: number;
  }) => void;
  /** Callback when widget is resized */
  onResize?: (size: { w: number; h: number }) => void;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Optional className */
  className?: string;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  editable = false,
  resizable = false,
  style,
  className = '',
}) => {
  // Handle widget removal (placeholder)
  const handleRemove = useCallback((): void => {
    // TODO: Implement widget removal
    console.log('Remove widget:', widget.id);
  }, [widget.id]);

  // Handle widget configuration (placeholder)
  const handleConfigure = useCallback((): void => {
    // TODO: Implement widget configuration
    console.log('Configure widget:', widget.id);
  }, [widget.id]);

  return (
    <div
      className={`widget-container bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
      style={style}
      data-widget-id={widget.id}
    >
      {/* Widget Header */}
      <div className="widget-header flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {widget.title}
        </h3>

        {editable && (
          <div className="flex items-center space-x-1">
            {/* Configure button */}
            <button
              onClick={handleConfigure}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              aria-label="Configure widget"
              title="Configure widget"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
              aria-label="Remove widget"
              title="Remove widget"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Widget Content */}
      <div className="widget-content p-4">
        {/* Placeholder content based on widget type */}
        {widget.type === 'asset-list' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Asset List Widget
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>AAPL</span>
                <span className="text-green-600">$150.25 (+2.5%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GOOGL</span>
                <span className="text-red-600">$2,750.80 (-1.2%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>MSFT</span>
                <span className="text-green-600">$305.15 (+0.8%)</span>
              </div>
            </div>
          </div>
        )}

        {widget.type === 'price-chart' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Chart Widget
            </div>
            <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">
                Chart Placeholder
              </span>
            </div>
          </div>
        )}

        {widget.type === 'news-feed' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              News Widget
            </div>
            <div className="space-y-2">
              <div className="text-sm">
                <div className="font-medium">Market Update</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">
                  2 hours ago
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium">Tech Stocks Rally</div>
                <div className="text-gray-600 dark:text-gray-400 text-xs">
                  4 hours ago
                </div>
              </div>
            </div>
          </div>
        )}

        {widget.type === 'market-summary' && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Market Summary
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">S&P 500</div>
                <div className="font-medium text-green-600">
                  4,185.47 (+0.5%)
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">NASDAQ</div>
                <div className="font-medium text-red-600">
                  12,843.81 (-0.3%)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Default content for unknown widget types */}
        {!['asset-list', 'price-chart', 'news-feed', 'market-summary'].includes(
          widget.type
        ) && (
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="text-sm">Unknown Widget Type</div>
            <div className="text-xs">{widget.type}</div>
          </div>
        )}
      </div>

      {/* Resize handle (only show in edit mode) */}
      {editable && resizable && (
        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M18 2l-8 8-8-8h16zM2 18l8-8 8 8H2z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default WidgetContainer;
