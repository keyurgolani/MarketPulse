/**
 * Dashboard Tabs Component
 * Navigation tabs for switching between dashboards
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import type { Dashboard } from '@/types/dashboard';
import { Button } from '@/components/ui/Button';

export interface DashboardTabsProps {
  /** List of dashboards to show as tabs */
  dashboards: Dashboard[];
  /** Currently active dashboard ID */
  activeDashboardId: string | null;
  /** Callback when dashboard tab is clicked */
  onDashboardChange: (dashboardId: string) => void;
  /** Callback when new dashboard is requested */
  onNewDashboard?: () => void;
  /** Maximum number of visible tabs before overflow */
  maxVisibleTabs?: number;
  /** Optional className for styling */
  className?: string;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  dashboards,
  activeDashboardId,
  onDashboardChange,
  onNewDashboard,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // Check scroll state
  const checkScrollState = useCallback((): void => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftScroll(scrollLeft > 0);
    setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Handle scroll
  const handleScroll = useCallback((direction: 'left' | 'right'): void => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    const newScrollLeft =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  }, []);

  // Handle tab click
  const handleTabClick = useCallback(
    (dashboardId: string): void => {
      onDashboardChange(dashboardId);
    },
    [onDashboardChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, dashboardId: string): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleTabClick(dashboardId);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const currentIndex = dashboards.findIndex(
          d => d.id === activeDashboardId
        );
        const nextIndex =
          event.key === 'ArrowLeft'
            ? Math.max(0, currentIndex - 1)
            : Math.min(dashboards.length - 1, currentIndex + 1);

        if (nextIndex !== currentIndex) {
          handleTabClick(dashboards[nextIndex].id);
        }
      }
    },
    [dashboards, activeDashboardId, handleTabClick]
  );

  // Update scroll state on mount and resize
  useEffect(() => {
    checkScrollState();

    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScrollEvent = (): void => {
      checkScrollState();
    };
    const handleResize = (): void => {
      checkScrollState();
    };

    container.addEventListener('scroll', handleScrollEvent);
    window.addEventListener('resize', handleResize);

    return (): void => {
      container.removeEventListener('scroll', handleScrollEvent);
      window.removeEventListener('resize', handleResize);
    };
  }, [checkScrollState]);

  // Scroll active tab into view
  useEffect(() => {
    if (!activeDashboardId) return;

    const container = scrollContainerRef.current;
    const activeTab = container?.querySelector(
      `[data-dashboard-id="${activeDashboardId}"]`
    ) as HTMLElement;

    if (container && activeTab) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();

      if (
        tabRect.left < containerRect.left ||
        tabRect.right > containerRect.right
      ) {
        activeTab.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeDashboardId]);

  if (dashboards.length === 0) {
    return null;
  }

  return (
    <div className={`dashboard-tabs ${className}`}>
      <div className="flex items-center">
        {/* Left scroll button */}
        {showLeftScroll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleScroll('left')}
            className="flex-shrink-0 mr-2"
            aria-label="Scroll tabs left"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
        )}

        {/* Tabs container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div
            className="flex space-x-1 min-w-max"
            role="tablist"
            aria-label="Dashboard tabs"
          >
            {dashboards.map(dashboard => {
              const isActive = dashboard.id === activeDashboardId;

              return (
                <button
                  key={dashboard.id}
                  data-dashboard-id={dashboard.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`dashboard-panel-${dashboard.id}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`
                    flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg
                    transition-colors duration-200 whitespace-nowrap
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${
                      isActive
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  onClick={() => handleTabClick(dashboard.id)}
                  onKeyDown={e => handleKeyDown(e, dashboard.id)}
                >
                  {/* Dashboard icon */}
                  <div className="flex-shrink-0">
                    {dashboard.isDefault ? (
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
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    ) : (
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
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Dashboard name */}
                  <span className="truncate max-w-[150px]">
                    {dashboard.name}
                  </span>

                  {/* Status indicators */}
                  {dashboard.isPublic && (
                    <div className="flex-shrink-0">
                      <svg
                        className="w-3 h-3 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-label="Public dashboard"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right scroll button */}
        {showRightScroll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleScroll('right')}
            className="flex-shrink-0 ml-2"
            aria-label="Scroll tabs right"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Button>
        )}

        {/* New dashboard button */}
        {onNewDashboard && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewDashboard}
            className="flex-shrink-0 ml-4"
            aria-label="Create new dashboard"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            New
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardTabs;
