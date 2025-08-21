/**
 * Widget Container Component
 * Wrapper for individual widgets with drag/drop and resize capabilities
 */

import React, { useCallback } from 'react';
import type { Widget } from '@/types/widget';
import type { Dashboard } from '@/types/dashboard';

// Import widget components
import { AssetListWidget } from '@/components/widgets/AssetListWidget';
import { AssetGridWidget } from '@/components/widgets/AssetGridWidget';
import { PriceChartWidget } from '@/components/widgets/PriceChartWidget';
import { WatchlistWidget } from '@/components/widgets/WatchlistWidget';
import { NewsFeedWidget } from '@/components/widgets/NewsFeedWidget';
import { MarketSummaryWidget } from '@/components/widgets/MarketSummaryWidget';
import { HeatmapWidget } from '@/components/widgets/HeatmapWidget';

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
  /** Callback when widget needs update */
  onWidgetUpdate?: (updates: Partial<Widget>) => void;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Optional className */
  className?: string;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  editable = false,
  resizable = false,
  onWidgetUpdate,
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

  // Render the appropriate widget component
  const renderWidgetContent = useCallback(() => {
    const commonProps = {
      widget,
      isEditing: editable,
      onUpdate: onWidgetUpdate,
      className: 'w-full h-full',
    };

    switch (widget.type) {
      case 'asset-list':
        return <AssetListWidget {...commonProps} />;
      case 'asset-grid':
        return <AssetGridWidget {...commonProps} />;
      case 'price-chart':
        return <PriceChartWidget {...commonProps} />;
      case 'watchlist':
        return <WatchlistWidget {...commonProps} />;
      case 'news-feed':
        return <NewsFeedWidget {...commonProps} />;
      case 'market-summary':
        return <MarketSummaryWidget {...commonProps} />;
      case 'heatmap':
        return <HeatmapWidget {...commonProps} />;
      default:
        return (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-sm">Unknown Widget Type</div>
              <div className="text-xs">{widget.type}</div>
            </div>
          </div>
        );
    }
  }, [widget, editable, onWidgetUpdate]);

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
      <div className="widget-content">{renderWidgetContent()}</div>

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
