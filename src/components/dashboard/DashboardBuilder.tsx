/**
 * Dashboard Builder Component
 * Provides drag-and-drop interface for creating and editing dashboards
 */

import React, { useState, useCallback } from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { Dashboard } from '@/types/dashboard';
import type { Widget, WidgetType } from '@/types/widget';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { logger } from '@/utils/logger';

export interface DashboardBuilderProps {
  /** Dashboard to edit (if editing existing) */
  dashboard?: Dashboard;
  /** Callback when dashboard is saved */
  onSave?: (dashboard: Dashboard) => void;
  /** Callback when builder is cancelled */
  onCancel?: () => void;
  /** Whether to show preview mode */
  showPreview?: boolean;
}

interface BuilderState {
  /** Current dashboard being built */
  dashboard: Partial<Dashboard>;
  /** Available widget types */
  availableWidgets: WidgetType[];
  /** Selected widget for configuration */
  selectedWidget: Widget | null;
  /** Whether in preview mode */
  isPreview: boolean;
  /** Whether dashboard is being saved */
  isSaving: boolean;
  /** Builder error state */
  error: string | null;
}

const AVAILABLE_WIDGET_TYPES: {
  type: WidgetType;
  name: string;
  description: string;
}[] = [
  {
    type: 'asset-list',
    name: 'Asset List',
    description: 'Display a list of assets with prices',
  },
  {
    type: 'asset-grid',
    name: 'Asset Grid',
    description: 'Grid view of assets with key metrics',
  },
  {
    type: 'price-chart',
    name: 'Price Chart',
    description: 'Interactive price chart for assets',
  },
  {
    type: 'news-feed',
    name: 'News Feed',
    description: 'Latest market news and updates',
  },
  {
    type: 'market-summary',
    name: 'Market Summary',
    description: 'Overview of market indices',
  },
  {
    type: 'heatmap',
    name: 'Market Heatmap',
    description: 'Visual heatmap of market performance',
  },
  {
    type: 'watchlist',
    name: 'Watchlist',
    description: 'Personal watchlist of assets',
  },
  {
    type: 'portfolio',
    name: 'Portfolio',
    description: 'Portfolio performance and holdings',
  },
  {
    type: 'economic-calendar',
    name: 'Economic Calendar',
    description: 'Upcoming economic events',
  },
  {
    type: 'heatmap',
    name: 'Market Heatmap',
    description: 'Visual market performance heatmap',
  },
  {
    type: 'screener',
    name: 'Stock Screener',
    description: 'Filter and find stocks by criteria',
  },
  {
    type: 'alerts',
    name: 'Price Alerts',
    description: 'Manage price alerts and notifications',
  },
  {
    type: 'performance',
    name: 'Performance',
    description: 'Performance analytics and metrics',
  },
];

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboard,
  onSave,
  onCancel,
  showPreview = false,
}) => {
  const { createDashboard, updateDashboard } = useDashboardStore();

  const [state, setState] = useState<BuilderState>({
    dashboard: dashboard || {
      name: 'New Dashboard',
      description: '',
      layout: {
        columns: 12,
        rows: 8,
        gap: 16,
        responsive: {
          mobile: {
            columns: 1,
            rows: 12,
            gap: 8,
            resizable: false,
            draggable: false,
          },
          tablet: {
            columns: 2,
            rows: 10,
            gap: 12,
            resizable: true,
            draggable: true,
          },
          desktop: {
            columns: 12,
            rows: 8,
            gap: 16,
            resizable: true,
            draggable: true,
          },
          ultrawide: {
            columns: 16,
            rows: 8,
            gap: 20,
            resizable: true,
            draggable: true,
          },
        },
        autoArrange: true,
        minWidgetSize: { width: 2, height: 2 },
        maxWidgetSize: { width: 8, height: 6 },
      },
      widgets: [],
      isPublic: false,
      tags: [],
    },
    availableWidgets: AVAILABLE_WIDGET_TYPES.map(w => w.type),
    selectedWidget: null,
    isPreview: showPreview,
    isSaving: false,
    error: null,
  });

  /**
   * Handle dashboard name change
   */
  const handleNameChange = useCallback((name: string): void => {
    setState(prev => ({
      ...prev,
      dashboard: { ...prev.dashboard, name },
    }));
  }, []);

  /**
   * Handle dashboard description change
   */
  const handleDescriptionChange = useCallback((description: string): void => {
    setState(prev => ({
      ...prev,
      dashboard: { ...prev.dashboard, description },
    }));
  }, []);

  /**
   * Add widget to dashboard
   */
  const handleAddWidget = useCallback((widgetType: WidgetType): void => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: widgetType,
      title:
        AVAILABLE_WIDGET_TYPES.find(w => w.type === widgetType)?.name ||
        widgetType,
      config: {},
      position: { x: 0, y: 0, w: 4, h: 3 },
      size: { minW: 2, minH: 2, maxW: 8, maxH: 6, resizable: true },
      createdAt: new Date(),
      updatedAt: new Date(),
      isVisible: true,
    };

    setState(prev => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        widgets: [...(prev.dashboard.widgets || []), newWidget],
      },
    }));

    logger.info('Widget added to dashboard', {
      widgetType,
      widgetId: newWidget.id,
    });
  }, []);

  /**
   * Remove widget from dashboard
   */
  const handleRemoveWidget = useCallback((widgetId: string): void => {
    setState(prev => ({
      ...prev,
      dashboard: {
        ...prev.dashboard,
        widgets: (prev.dashboard.widgets || []).filter(w => w.id !== widgetId),
      },
      selectedWidget:
        prev.selectedWidget?.id === widgetId ? null : prev.selectedWidget,
    }));

    logger.info('Widget removed from dashboard', { widgetId });
  }, []);

  /**
   * Select widget for configuration
   */
  const handleSelectWidget = useCallback((widget: Widget): void => {
    setState(prev => ({
      ...prev,
      selectedWidget: widget,
    }));
  }, []);

  /**
   * Update widget configuration
   */
  const handleUpdateWidget = useCallback(
    (widgetId: string, updates: Partial<Widget>): void => {
      setState(prev => ({
        ...prev,
        dashboard: {
          ...prev.dashboard,
          widgets: (prev.dashboard.widgets || []).map(w =>
            w.id === widgetId ? { ...w, ...updates, updatedAt: new Date() } : w
          ),
        },
        selectedWidget:
          prev.selectedWidget?.id === widgetId
            ? { ...prev.selectedWidget, ...updates, updatedAt: new Date() }
            : prev.selectedWidget,
      }));
    },
    []
  );

  /**
   * Toggle preview mode
   */
  const handleTogglePreview = useCallback((): void => {
    setState(prev => ({
      ...prev,
      isPreview: !prev.isPreview,
    }));
  }, []);

  /**
   * Save dashboard
   */
  const handleSave = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      const dashboardData = {
        ...state.dashboard,
        updatedAt: new Date(),
      } as Dashboard;

      let savedDashboard: Dashboard | null;

      if (dashboard?.id) {
        // Update existing dashboard
        savedDashboard = await updateDashboard(dashboard.id, dashboardData);
      } else {
        // Create new dashboard
        savedDashboard = await createDashboard(dashboardData);
      }

      if (!savedDashboard) {
        throw new Error('Failed to save dashboard');
      }

      setState(prev => ({ ...prev, isSaving: false }));
      onSave?.(savedDashboard);

      logger.info('Dashboard saved successfully', {
        dashboardId: savedDashboard.id,
        widgetCount: savedDashboard.widgets.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save dashboard';
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: errorMessage,
      }));

      logger.error('Error saving dashboard', { error: errorMessage });
    }
  }, [
    state.dashboard,
    dashboard?.id,
    updateDashboard,
    createDashboard,
    onSave,
  ]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback((): void => {
    onCancel?.();
  }, [onCancel]);

  if (state.isSaving) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loading text="Saving dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard-builder h-full flex flex-col">
      {/* Builder Header */}
      <div className="builder-header bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={state.dashboard.name || ''}
              onChange={e => handleNameChange(e.target.value)}
              className="text-xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Dashboard Name"
            />
            <input
              type="text"
              value={state.dashboard.description || ''}
              onChange={e => handleDescriptionChange(e.target.value)}
              className="text-sm bg-transparent border-none outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400 dark:placeholder-gray-500 mt-1 w-full"
              placeholder="Dashboard description (optional)"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleTogglePreview}
              variant={state.isPreview ? 'primary' : 'secondary'}
              size="sm"
            >
              {state.isPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              size="sm"
              disabled={!state.dashboard.name?.trim()}
            >
              Save
            </Button>
            <Button onClick={handleCancel} variant="secondary" size="sm">
              Cancel
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
            {state.error}
          </div>
        )}
      </div>

      {/* Builder Content */}
      <div className="builder-content flex-1 flex">
        {/* Widget Library (only in edit mode) */}
        {!state.isPreview && (
          <div className="widget-library w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Widget Library
            </h3>

            <div className="space-y-2">
              {AVAILABLE_WIDGET_TYPES.map(widget => (
                <button
                  key={widget.type}
                  onClick={() => handleAddWidget(widget.type)}
                  className="w-full p-3 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {widget.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {widget.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Canvas */}
        <div className="dashboard-canvas flex-1 p-4">
          <div className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* Canvas Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {state.isPreview ? 'Preview' : 'Canvas'}
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {state.dashboard.widgets?.length || 0} widgets
                </div>
              </div>
            </div>

            {/* Canvas Content */}
            <div className="p-4 h-full">
              {state.dashboard.widgets && state.dashboard.widgets.length > 0 ? (
                <div className="grid grid-cols-12 gap-4 h-full">
                  {state.dashboard.widgets.map(widget => (
                    <div
                      key={widget.id}
                      className={`bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-4 cursor-pointer transition-colors ${
                        state.selectedWidget?.id === widget.id
                          ? 'ring-2 ring-blue-500 border-blue-500'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      style={{
                        gridColumn: `span ${Math.min(widget.position.w, 12)}`,
                        gridRow: `span ${widget.position.h}`,
                      }}
                      onClick={() => handleSelectWidget(widget)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectWidget(widget);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Select widget ${widget.title}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                          {widget.title}
                        </h5>
                        {!state.isPreview && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleRemoveWidget(widget.id);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {widget.type}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {widget.position.w}x{widget.position.h}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    <div className="text-lg font-medium mb-2">
                      No widgets added
                    </div>
                    <div className="text-sm">
                      {state.isPreview
                        ? 'Switch to edit mode to add widgets'
                        : 'Select widgets from the library to get started'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Widget Configuration Panel (only in edit mode with selected widget) */}
        {!state.isPreview &&
          state.selectedWidget &&
          ((): React.ReactElement => {
            const selectedWidget = state.selectedWidget;
            return (
              <div className="widget-config w-64 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Widget Settings
                </h3>

                <div className="space-y-4">
                  {/* Widget Title */}
                  <div>
                    <label
                      htmlFor={`title-${state.selectedWidget.id}`}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Title
                    </label>
                    <input
                      id={`title-${selectedWidget.id}`}
                      type="text"
                      value={selectedWidget.title}
                      onChange={e =>
                        handleUpdateWidget(selectedWidget.id, {
                          title: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>

                  {/* Widget Size */}
                  <div>
                    <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Size
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor={`width-${state.selectedWidget.id}`}
                          className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                        >
                          Width
                        </label>
                        <input
                          id={`width-${selectedWidget.id}`}
                          type="number"
                          min="1"
                          max="12"
                          value={selectedWidget.position.w}
                          onChange={e =>
                            handleUpdateWidget(selectedWidget.id, {
                              position: {
                                ...selectedWidget.position,
                                w: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`height-${state.selectedWidget.id}`}
                          className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                        >
                          Height
                        </label>
                        <input
                          id={`height-${selectedWidget.id}`}
                          type="number"
                          min="1"
                          max="8"
                          value={selectedWidget.position.h}
                          onChange={e =>
                            handleUpdateWidget(selectedWidget.id, {
                              position: {
                                ...selectedWidget.position,
                                h: parseInt(e.target.value) || 1,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Widget Visibility */}
                  <div>
                    <label
                      htmlFor={`visible-${selectedWidget.id}`}
                      className="flex items-center"
                    >
                      <input
                        id={`visible-${selectedWidget.id}`}
                        type="checkbox"
                        checked={selectedWidget.isVisible}
                        onChange={e =>
                          handleUpdateWidget(selectedWidget.id, {
                            isVisible: e.target.checked,
                          })
                        }
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Visible
                      </span>
                    </label>
                  </div>

                  {/* Widget Type Info */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div className="font-medium mb-1">
                        Type: {selectedWidget.type}
                      </div>
                      <div className="text-xs">
                        {
                          AVAILABLE_WIDGET_TYPES.find(
                            w => w.type === selectedWidget.type
                          )?.description
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
};

export default DashboardBuilder;
