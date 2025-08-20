/**
 * Dashboard Container Component
 * Main container for dashboard layout and widget management
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore, useActiveDashboard } from '@/stores/dashboardStore';
import { useApiStore } from '@/stores/apiStore';
import { routingService } from '@/services/routingService';
import { useResponsiveDashboard } from '@/hooks/useResponsiveDashboard';
import { DashboardLayout } from './DashboardLayout';
import { DashboardHeader } from './DashboardHeader';
import { DashboardTabs } from './DashboardTabs';
import { CollaborativeIndicators } from './CollaborativeIndicators';
import { CollaborativeEditingIndicators } from './CollaborativeEditingIndicators';
import { CursorTracker } from './CursorTracker';
import { SharingModal } from './SharingModal';
import { Loading } from '@/components/ui/Loading';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export interface DashboardContainerProps {
  /** Optional className for styling */
  className?: string;
  /** Whether to show dashboard tabs */
  showTabs?: boolean;
  /** Whether to show dashboard header */
  showHeader?: boolean;
  /** Initial dashboard ID from URL */
  initialDashboardId?: string;
  /** Initial edit mode from URL */
  initialEditMode?: boolean;
  /** Initial tab from URL */
  initialTab?: string | null;
  /** Initial widget from URL */
  initialWidget?: string | null;
  /** Callback when dashboard changes */
  onDashboardChange?: (dashboardId: string | null) => void;
}

export const DashboardContainer: React.FC<DashboardContainerProps> = ({
  className = '',
  showTabs = true,
  showHeader = true,
  initialDashboardId,
  initialEditMode = false,
  initialTab,
  initialWidget,
  onDashboardChange,
}) => {
  const navigate = useNavigate();
  const activeDashboard = useActiveDashboard();
  const {
    dashboards,
    defaultDashboards,
    isLoading,
    error,
    loadDashboards,
    loadDefaultDashboards,
    setActiveDashboard,
    setEditMode,
    clearError,
  } = useDashboardStore();

  const { startLoading, stopLoading } = useApiStore();

  // Sharing modal state
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);

  // Responsive dashboard behavior
  const {
    isMobile,
    isTablet,
    shouldCollapseTabs,
    getMaxVisibleTabs,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useResponsiveDashboard(activeDashboard || undefined);

  // Load dashboards on mount
  useEffect(() => {
    const loadAllDashboards = async (): Promise<void> => {
      startLoading('dashboard-load');
      try {
        await Promise.all([loadDashboards(), loadDefaultDashboards()]);
      } catch (error) {
        console.error('Failed to load dashboards:', error);
        // Don't re-throw the error to prevent it from bubbling up to ErrorBoundary
      } finally {
        stopLoading('dashboard-load');
      }
    };

    loadAllDashboards();
  }, [loadDashboards, loadDefaultDashboards, startLoading, stopLoading]);

  // Handle initial dashboard from URL
  useEffect(() => {
    try {
      if (
        initialDashboardId &&
        (dashboards.length > 0 || defaultDashboards.length > 0)
      ) {
        const allDashboards = [
          ...(Array.isArray(dashboards) ? dashboards : []),
          ...(Array.isArray(defaultDashboards) ? defaultDashboards : []),
        ];
        const targetDashboard = allDashboards.find(
          d => d.id === initialDashboardId
        );

        if (targetDashboard) {
          setActiveDashboard(initialDashboardId);
          if (initialEditMode) {
            setEditMode(true);
          }

          // Add to navigation history
          routingService.addToNavigationHistory({
            dashboardId: initialDashboardId,
            edit: initialEditMode,
            tab: initialTab || undefined,
            widget: initialWidget || undefined,
          });
        } else {
          // Dashboard not found, redirect to default
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (error) {
      console.error('Error handling initial dashboard from URL:', error);
      // Don't re-throw to prevent ErrorBoundary trigger
    }
  }, [
    initialDashboardId,
    initialEditMode,
    initialTab,
    initialWidget,
    dashboards,
    defaultDashboards,
    setActiveDashboard,
    setEditMode,
    navigate,
  ]);

  // Set initial active dashboard if none selected and no URL params
  useEffect(() => {
    try {
      if (
        !initialDashboardId &&
        !activeDashboard &&
        (dashboards.length > 0 || defaultDashboards.length > 0)
      ) {
        // Prefer user's first dashboard, fallback to first default dashboard
        const firstDashboard = dashboards[0] || defaultDashboards[0];
        if (firstDashboard) {
          setActiveDashboard(firstDashboard.id);
          // Update URL to reflect the active dashboard
          navigate(`/dashboard/${firstDashboard.id}`, { replace: true });
        }
      }
    } catch (error) {
      console.error('Error setting initial active dashboard:', error);
      // Don't re-throw to prevent ErrorBoundary trigger
    }
  }, [
    initialDashboardId,
    activeDashboard,
    dashboards,
    defaultDashboards,
    setActiveDashboard,
    navigate,
  ]);

  // Handle dashboard change with URL update
  const handleDashboardChange = useCallback(
    (dashboardId: string | null): void => {
      setActiveDashboard(dashboardId);
      onDashboardChange?.(dashboardId);

      // Update URL
      if (dashboardId) {
        navigate(`/dashboard/${dashboardId}`, { replace: false });

        // Add to navigation history
        routingService.addToNavigationHistory({
          dashboardId,
        });
      } else {
        navigate('/dashboard', { replace: false });
      }
    },
    [setActiveDashboard, onDashboardChange, navigate]
  );

  // Handle error dismissal
  const handleErrorDismiss = useCallback((): void => {
    clearError();
  }, [clearError]);

  // Handle share modal
  const handleShare = useCallback((): void => {
    setIsSharingModalOpen(true);
  }, []);

  const handleSharingModalClose = useCallback((): void => {
    setIsSharingModalOpen(false);
  }, []);

  const handleSharingUpdated = useCallback((): void => {
    // Optionally refresh dashboard data or show success message
    // For now, just log the update
    console.log('Dashboard sharing updated');
  }, []);

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

  const allDashboards = [
    ...(Array.isArray(dashboards) ? dashboards : []),
    ...(Array.isArray(defaultDashboards) ? defaultDashboards : []),
  ];

  // Touch event handlers for mobile
  const touchHandlers = {
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>): void =>
      handleTouchStart(e.nativeEvent),
    onTouchMove: (e: React.TouchEvent<HTMLDivElement>): void =>
      handleTouchMove(e.nativeEvent),
    onTouchEnd: (e: React.TouchEvent<HTMLDivElement>): void =>
      handleTouchEnd(e.nativeEvent),
  };

  return (
    <ErrorBoundary>
      <div
        className={`dashboard-container flex flex-col h-full ${className} ${
          isMobile ? 'mobile-layout' : ''
        } ${isTablet ? 'tablet-layout' : ''}`}
        {...touchHandlers}
      >
        {/* Dashboard Tabs */}
        {showTabs && allDashboards.length > 1 && !shouldCollapseTabs() && (
          <div className="dashboard-tabs-container border-b border-gray-200 dark:border-gray-700">
            <DashboardTabs
              dashboards={allDashboards}
              activeDashboardId={activeDashboard?.id || null}
              onDashboardChange={handleDashboardChange}
              maxVisibleTabs={getMaxVisibleTabs()}
              collapsible={shouldCollapseTabs()}
            />
          </div>
        )}

        {/* Mobile Dashboard Selector */}
        {showTabs && allDashboards.length > 1 && shouldCollapseTabs() && (
          <div className="mobile-dashboard-selector border-b border-gray-200 dark:border-gray-700 p-2">
            <select
              value={activeDashboard?.id || ''}
              onChange={e => handleDashboardChange(e.target.value || null)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {allDashboards.map(dashboard => (
                <option key={dashboard.id} value={dashboard.id}>
                  {dashboard.name} {dashboard.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
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
              onShare={handleShare}
            />
          </div>
        )}

        {/* Collaborative Indicators */}
        {activeDashboard && (
          <div className="collaborative-indicators-container border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <CollaborativeIndicators
                dashboardId={activeDashboard.id}
                userId="default-user" // TODO: Get from user store
                className="text-xs"
              />
              <CollaborativeEditingIndicators
                dashboardId={activeDashboard.id}
                userId="default-user" // TODO: Get from user store
                showUserActivity={true}
                showEditingStatus={true}
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* Cursor Tracker */}
        {activeDashboard && (
          <CursorTracker
            dashboardId={activeDashboard.id}
            userId="default-user" // TODO: Get from user store
            enabled={true}
          />
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

        {/* Sharing Modal */}
        {activeDashboard && (
          <SharingModal
            dashboard={activeDashboard}
            isOpen={isSharingModalOpen}
            onClose={handleSharingModalClose}
            onSharingUpdated={handleSharingUpdated}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DashboardContainer;
