/**
 * Dashboard Container Component
 * Main container for dashboard layout and widget management
 */

import React, { useEffect, useCallback } from 'react';
import { useDashboardStore, useActiveDashboard } from '@/stores/dashboardStore';
import { useApiStore } from '@/stores/apiStore';
import { DashboardLayout } from './DashboardLayout';
import { DashboardHeader } from './DashboardHeader';
import { DashboardTabs } from './DashboardTabs';
import { Loading } from '@/components/ui/Loading';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export interface DashboardContainerProps {
  /** Optional className for styling */
  className?: string;
  /** Whether to show dashboard tabs */
  showTabs?: boolean;
  /** Whether to show dashboard header */
  showHeader?: boolean;
  /** Callback when dashboard changes */
  onDashboardChange?: (dashboardId: string | null) => void;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  className = '',
  showTabs = true,
  showHeader = true,
  onDashboardChange,
}) => {
  const activeDashboard = useActiveDashboard();
  const {
    dashboards,
    defaultDashboards,
    isLoading,
    error,
    loadDashboards,
    loadDefaultDashboards,
    setActiveDashboard,
    clearError,
  } = useDashboardStore();

  const { startLoading, stopLoading } = useApiStore();

  // Load dashboards on mount
  useEffect(() => {
    const loadAllDashboards = async (): Promise<void> => {
      startLoading('dashboard-load');
      try {
        await Promise.all([loadDashboards(), loadDefaultDashboards()]);
      } finally {
        stopLoading('dashboard-load');
      }
    };

    loadAllDashboards();
  }, [loadDashboards, loadDefaultDashboards, startLoading, stopLoading]);

  // Set initial active dashboard if none selected
  useEffect(() => {
    if (
      !activeDashboard &&
      (dashboards.length > 0 || defaultDashboards.length > 0)
    ) {
      // Prefer user's first dashboard, fallback to first default dashboard
      const firstDashboard = dashboards[0] || defaultDashboards[0];
      if (firstDashboard) {
        setActiveDashboard(firstDashboard.id);
      }
    }
  }, [activeDashboard, dashboards, defaultDashboards, setActiveDashboard]);

  // Handle dashboard change
  const handleDashboardChange = useCallback(
    (dashboardId: string | null): void => {
      setActiveDashboard(dashboardId);
      onDashboardChange?.(dashboardId);
    },
    [setActiveDashboard, onDashboardChange]
  );

  // Handle error dismissal
  const handleErrorDismiss = useCallback((): void => {
    clearError();
  }, [clearError]);

  // Show loading state
  if (isLoading && !activeDashboard) {
    return (
      <div className={`dashboard-container ${className}`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading text="Loading dashboards..." />
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !activeDashboard) {
    return (
      <div className={`dashboard-container ${className}`}>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-red-600 dark:text-red-400 text-center">
            <h3 className="text-lg font-semibold mb-2">
              Failed to Load Dashboards
            </h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={handleErrorDismiss}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (
    !activeDashboard &&
    dashboards.length === 0 &&
    defaultDashboards.length === 0
  ) {
    return (
      <div className={`dashboard-container ${className}`}>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-gray-600 dark:text-gray-400 text-center">
            <h3 className="text-lg font-semibold mb-2">
              No Dashboards Available
            </h3>
            <p className="text-sm">
              Create your first dashboard to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const allDashboards = [...dashboards, ...defaultDashboards];

  return (
    <ErrorBoundary>
      <div className={`dashboard-container flex flex-col h-full ${className}`}>
        {/* Dashboard Tabs */}
        {showTabs && allDashboards.length > 1 && (
          <div className="dashboard-tabs-container border-b border-gray-200 dark:border-gray-700">
            <DashboardTabs
              dashboards={allDashboards}
              activeDashboardId={activeDashboard?.id || null}
              onDashboardChange={handleDashboardChange}
            />
          </div>
        )}

        {/* Dashboard Header */}
        {showHeader && activeDashboard && (
          <div className="dashboard-header-container border-b border-gray-200 dark:border-gray-700">
            <DashboardHeader
              dashboard={activeDashboard}
              onRefresh={() => {
                // TODO: Implement dashboard refresh
              }}
            />
          </div>
        )}

        {/* Dashboard Content */}
        <div className="dashboard-content flex-1 overflow-hidden">
          {activeDashboard ? (
            <DashboardLayout dashboard={activeDashboard} className="h-full" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Loading text="Loading dashboard..." />
            </div>
          )}
        </div>

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm">{error}</span>
              <button
                onClick={handleErrorDismiss}
                className="text-white hover:text-gray-200"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DashboardContainer;
