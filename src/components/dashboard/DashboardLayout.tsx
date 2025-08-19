/**
 * Dashboard Layout Component
 * Handles responsive grid layout and widget positioning
 */

import React, { useMemo, useCallback } from 'react';
import type { Dashboard } from '@/types/dashboard';
import { getResponsiveLayout } from '@/types/dashboard';
import { useEditMode } from '@/stores/dashboardStore';
import { WidgetContainer } from './WidgetContainer';

export interface DashboardLayoutProps {
  /** Dashboard to render */
  dashboard: Dashboard;
  /** Optional className for styling */
  className?: string;
  /** Whether widgets can be resized */
  resizable?: boolean;
  /** Whether widgets can be dragged */
  draggable?: boolean;
  /** Callback when layout changes */
  onLayoutChange?: (layout: Dashboard['layout']) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  dashboard,
  className = '',
  resizable = true,
  draggable = true,
  onLayoutChange,
}) => {
  const editMode = useEditMode();

  // Get responsive layout based on screen size
  const responsiveLayout = useMemo(() => {
    // In a real implementation, we'd use a hook to get screen width
    // For now, assume desktop layout
    const screenWidth =
      typeof window !== 'undefined' ? window.innerWidth : 1024;
    return getResponsiveLayout(dashboard.layout, screenWidth);
  }, [dashboard.layout]);

  // Calculate grid styles
  const gridStyles = useMemo(() => {
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${responsiveLayout.columns}, 1fr)`,
      gridTemplateRows: `repeat(${responsiveLayout.rows}, minmax(200px, 1fr))`,
      gap: `${responsiveLayout.gap}px`,
      padding: `${responsiveLayout.gap}px`,
      height: '100%',
      overflow: 'auto',
    };
  }, [responsiveLayout]);

  // Handle widget position change
  const handleWidgetPositionChange = useCallback(
    (
      widgetId: string,
      newPosition: { x: number; y: number; w: number; h: number }
    ): void => {
      if (!editMode || !onLayoutChange) return;

      // Update widget position in dashboard layout
      const updatedWidgets = dashboard.widgets.map(widget => {
        if (widget.id === widgetId) {
          return {
            ...widget,
            position: {
              ...widget.position,
              x: newPosition.x,
              y: newPosition.y,
              w: newPosition.w,
              h: newPosition.h,
            },
          };
        }
        return widget;
      });

      const updatedDashboard = {
        ...dashboard,
        widgets: updatedWidgets,
      };

      onLayoutChange(updatedDashboard.layout);
    },
    [editMode, dashboard, onLayoutChange]
  );

  // Handle widget resize
  const handleWidgetResize = useCallback(
    (widgetId: string, newSize: { w: number; h: number }): void => {
      if (!editMode || !resizable || !onLayoutChange) return;

      handleWidgetPositionChange(widgetId, {
        x: dashboard.widgets.find(w => w.id === widgetId)?.position.x || 0,
        y: dashboard.widgets.find(w => w.id === widgetId)?.position.y || 0,
        w: newSize.w,
        h: newSize.h,
      });
    },
    [
      editMode,
      resizable,
      dashboard.widgets,
      handleWidgetPositionChange,
      onLayoutChange,
    ]
  );

  // Sort widgets by position for proper rendering order
  const sortedWidgets = useMemo(() => {
    return [...dashboard.widgets].sort((a, b) => {
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y;
      }
      return a.position.x - b.position.x;
    });
  }, [dashboard.widgets]);

  return (
    <div
      className={`dashboard-layout ${className}`}
      style={gridStyles}
      role="main"
      aria-label={`Dashboard: ${dashboard.name}`}
    >
      {sortedWidgets.map(widget => (
        <WidgetContainer
          key={widget.id}
          widget={widget}
          dashboard={dashboard}
          editable={editMode}
          resizable={resizable && editMode}
          draggable={draggable && editMode}
          onPositionChange={newPosition =>
            handleWidgetPositionChange(widget.id, newPosition)
          }
          onResize={newSize => handleWidgetResize(widget.id, newSize)}
          style={{
            gridColumn: `${widget.position.x + 1} / span ${widget.position.w}`,
            gridRow: `${widget.position.y + 1} / span ${widget.position.h}`,
          }}
        />
      ))}

      {/* Empty state when no widgets */}
      {dashboard.widgets.length === 0 && (
        <div className="col-span-full row-span-full flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <h3 className="text-lg font-semibold mb-2">No Widgets</h3>
            <p className="text-sm">
              {editMode
                ? 'Add widgets to customize your dashboard'
                : 'This dashboard has no widgets configured'}
            </p>
          </div>
        </div>
      )}

      {/* Grid overlay in edit mode */}
      {editMode && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: `${100 / responsiveLayout.columns}% ${100 / responsiveLayout.rows}%`,
          }}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
