/**
 * Dashboard Header Component
 * Shows dashboard title, actions, and status
 */

import React, { useCallback } from 'react';
import type { Dashboard } from '@/types/dashboard';
import { useEditMode, useDashboardStore } from '@/stores/dashboardStore';
import { Button } from '@/components/ui/Button';
import { SyncStatusIndicator } from './SyncStatusIndicator';

export interface DashboardHeaderProps {
  /** Dashboard to display header for */
  dashboard: Dashboard;
  /** Callback when refresh is requested */
  onRefresh?: () => void;
  /** Callback when edit is requested */
  onEdit?: () => void;
  /** Callback when share is requested */
  onShare?: () => void;
  /** Optional className for styling */
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dashboard,
  onRefresh,
  onEdit,
  onShare,
  className = '',
}) => {
  const editMode = useEditMode();
  const { setEditMode } = useDashboardStore();

  // Handle edit mode toggle
  const handleEditToggle = useCallback((): void => {
    const newEditMode = !editMode;
    setEditMode(newEditMode);

    if (newEditMode) {
      onEdit?.();
    }
  }, [editMode, setEditMode, onEdit]);

  // Handle refresh
  const handleRefresh = useCallback((): void => {
    onRefresh?.();
  }, [onRefresh]);

  // Handle share
  const handleShare = useCallback((): void => {
    onShare?.();
  }, [onShare]);

  return (
    <header
      className={`dashboard-header bg-white dark:bg-gray-800 ${className}`}
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Dashboard Info */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {dashboard.name}
            </h1>
            {dashboard.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {dashboard.description}
              </p>
            )}
          </div>

          {/* Dashboard Status Indicators */}
          <div className="flex items-center space-x-2">
            {dashboard.isDefault && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Default
              </span>
            )}

            {dashboard.isPublic && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Public
              </span>
            )}

            {editMode && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Editing
              </span>
            )}
          </div>
        </div>

        {/* Dashboard Actions */}
        <div className="flex items-center space-x-4">
          {/* Sync Status */}
          <SyncStatusIndicator compact={true} />

          <div className="flex items-center space-x-2">
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              aria-label="Refresh dashboard"
              title="Refresh dashboard data"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </Button>

            {/* Share Button */}
            {!dashboard.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                aria-label="Share dashboard"
                title="Share dashboard"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                  />
                </svg>
                Share
              </Button>
            )}

            {/* Edit Button */}
            {!dashboard.isDefault && (
              <Button
                variant={editMode ? 'primary' : 'outline'}
                size="sm"
                onClick={handleEditToggle}
                aria-label={editMode ? 'Exit edit mode' : 'Enter edit mode'}
                title={editMode ? 'Exit edit mode' : 'Edit dashboard'}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {editMode ? 'Done' : 'Edit'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Tags */}
      {dashboard.tags.length > 0 && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {dashboard.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
