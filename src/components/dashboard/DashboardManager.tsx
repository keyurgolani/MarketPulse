/**
 * Dashboard Manager Component
 * Provides dashboard CRUD operations, cloning, import/export functionality
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { Dashboard } from '@/types/dashboard';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { logger } from '@/utils/logger';

export interface DashboardManagerProps {
  /** Callback when dashboard is selected for editing */
  onEdit?: (dashboard: Dashboard) => void;
  /** Callback when dashboard is selected for viewing */
  onView?: (dashboard: Dashboard) => void;
  /** Whether to show admin controls */
  showAdminControls?: boolean;
}

interface ManagerState {
  /** Search query for filtering dashboards */
  searchQuery: string;
  /** Selected dashboard for operations */
  selectedDashboard: Dashboard | null;
  /** Whether showing delete confirmation */
  showDeleteConfirm: boolean;
  /** Whether showing export modal */
  showExportModal: boolean;
  /** Whether showing import modal */
  showImportModal: boolean;
  /** Import data */
  importData: string;
  /** Operation in progress */
  operationInProgress: string | null;
  /** Error state */
  error: string | null;
}

export const DashboardManager: React.FC<DashboardManagerProps> = ({
  onEdit,
  onView,
  showAdminControls = false,
}) => {
  // Note: showAdminControls reserved for future admin functionality
  void showAdminControls; // Suppress unused variable warning
  const {
    dashboards,
    defaultDashboards,
    isLoading,
    error: storeError,
    loadDashboards,
    deleteDashboard,
    duplicateDashboard,
  } = useDashboardStore();

  const [state, setState] = useState<ManagerState>({
    searchQuery: '',
    selectedDashboard: null,
    showDeleteConfirm: false,
    showExportModal: false,
    showImportModal: false,
    importData: '',
    operationInProgress: null,
    error: null,
  });

  /**
   * Filter dashboards based on search query
   */
  const filteredDashboards = [...dashboards, ...defaultDashboards].filter(
    dashboard =>
      dashboard.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      dashboard.description
        ?.toLowerCase()
        .includes(state.searchQuery.toLowerCase()) ||
      dashboard.tags.some(tag =>
        tag.toLowerCase().includes(state.searchQuery.toLowerCase())
      )
  );

  /**
   * Handle search query change
   */
  const handleSearchChange = useCallback((query: string): void => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  /**
   * Handle dashboard selection
   */
  const handleSelectDashboard = useCallback((dashboard: Dashboard): void => {
    setState(prev => ({ ...prev, selectedDashboard: dashboard }));
  }, []);

  /**
   * Handle dashboard edit
   */
  const handleEditDashboard = useCallback(
    (dashboard: Dashboard): void => {
      onEdit?.(dashboard);
    },
    [onEdit]
  );

  /**
   * Handle dashboard view
   */
  const handleViewDashboard = useCallback(
    (dashboard: Dashboard): void => {
      onView?.(dashboard);
    },
    [onView]
  );

  /**
   * Handle dashboard duplication
   */
  const handleDuplicateDashboard = useCallback(
    async (dashboard: Dashboard): Promise<void> => {
      setState(prev => ({
        ...prev,
        operationInProgress: 'duplicate',
        error: null,
      }));

      try {
        const duplicatedDashboard = await duplicateDashboard(dashboard.id);

        if (duplicatedDashboard) {
          logger.info('Dashboard duplicated successfully', {
            originalId: dashboard.id,
            duplicatedId: duplicatedDashboard.id,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to duplicate dashboard';
        setState(prev => ({ ...prev, error: errorMessage }));
        logger.error('Error duplicating dashboard', { error: errorMessage });
      } finally {
        setState(prev => ({ ...prev, operationInProgress: null }));
      }
    },
    [duplicateDashboard]
  );

  /**
   * Handle dashboard deletion
   */
  const handleDeleteDashboard = useCallback(
    async (dashboard: Dashboard): Promise<void> => {
      setState(prev => ({
        ...prev,
        operationInProgress: 'delete',
        error: null,
      }));

      try {
        await deleteDashboard(dashboard.id);
        setState(prev => ({
          ...prev,
          showDeleteConfirm: false,
          selectedDashboard: null,
        }));

        logger.info('Dashboard deleted successfully', {
          dashboardId: dashboard.id,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete dashboard';
        setState(prev => ({ ...prev, error: errorMessage }));
        logger.error('Error deleting dashboard', { error: errorMessage });
      } finally {
        setState(prev => ({ ...prev, operationInProgress: null }));
      }
    },
    [deleteDashboard]
  );

  /**
   * Handle dashboard export
   */
  const handleExportDashboard = useCallback((dashboard: Dashboard): void => {
    const exportData = {
      version: '1.0',
      dashboard: {
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        widgets: dashboard.widgets,
        tags: dashboard.tags,
        exportedAt: new Date().toISOString(),
      },
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${dashboard.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_dashboard.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setState(prev => ({ ...prev, showExportModal: false }));
    logger.info('Dashboard exported successfully', {
      dashboardId: dashboard.id,
    });
  }, []);

  /**
   * Handle dashboard import
   */
  const handleImportDashboard = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, operationInProgress: 'import', error: null }));

    try {
      const importedData = JSON.parse(state.importData);

      if (!importedData.dashboard) {
        throw new Error('Invalid dashboard export format');
      }

      const dashboardData = {
        ...importedData.dashboard,
        name: `${importedData.dashboard.name} (Imported)`,
        id: undefined, // Let the system generate a new ID
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false,
        isPublic: false,
      };

      // Create the imported dashboard
      // Note: This would need to be implemented in the dashboard store
      logger.info('Dashboard import initiated', {
        originalName: importedData.dashboard.name,
        dashboardData,
      });

      setState(prev => ({
        ...prev,
        showImportModal: false,
        importData: '',
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to import dashboard';
      setState(prev => ({ ...prev, error: errorMessage }));
      logger.error('Error importing dashboard', { error: errorMessage });
    } finally {
      setState(prev => ({ ...prev, operationInProgress: null }));
    }
  }, [state.importData]);

  /**
   * Clear error after delay
   */
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);

      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [state.error]);

  /**
   * Load dashboards on mount
   */
  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loading text="Loading dashboards..." />
      </div>
    );
  }

  return (
    <div className="dashboard-manager p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Manager
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your dashboards and templates
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            onClick={() =>
              setState(prev => ({ ...prev, showImportModal: true }))
            }
            variant="secondary"
            size="sm"
          >
            Import
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {(state.error || storeError) && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">
            {state.error || storeError}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={state.searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search dashboards..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDashboards.map(dashboard => (
          <div
            key={dashboard.id}
            className="dashboard-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
          >
            {/* Dashboard Info */}
            <div className="mb-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {dashboard.name}
                </h3>
                {dashboard.isDefault && (
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded">
                    Default
                  </span>
                )}
              </div>

              {dashboard.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {dashboard.description}
                </p>
              )}

              {/* Dashboard Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-500 mb-3">
                <span>{dashboard.widgets.length} widgets</span>
                <span>
                  {new Date(dashboard.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Tags */}
              {dashboard.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {dashboard.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {dashboard.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-500">
                      +{dashboard.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button
                onClick={() => handleViewDashboard(dashboard)}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                View
              </Button>
              <Button
                onClick={() => handleEditDashboard(dashboard)}
                variant="secondary"
                size="sm"
              >
                Edit
              </Button>
              <div className="relative">
                <Button
                  onClick={() => handleSelectDashboard(dashboard)}
                  variant="secondary"
                  size="sm"
                  className="px-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </Button>

                {/* Dropdown Menu */}
                {state.selectedDashboard?.id === dashboard.id && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={() => handleDuplicateDashboard(dashboard)}
                        disabled={state.operationInProgress === 'duplicate'}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleExportDashboard(dashboard)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Export
                      </button>
                      {!dashboard.isDefault && (
                        <button
                          onClick={() =>
                            setState(prev => ({
                              ...prev,
                              showDeleteConfirm: true,
                            }))
                          }
                          className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredDashboards.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <h3 className="text-lg font-semibold mb-2">No Dashboards Found</h3>
            <p className="text-sm">
              {state.searchQuery
                ? 'No dashboards match your search criteria.'
                : "You don't have any dashboards yet. Create your first dashboard to get started."}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {state.showDeleteConfirm && state.selectedDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Dashboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;
              {state.selectedDashboard.name}&quot;? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() =>
                  setState(prev => ({ ...prev, showDeleteConfirm: false }))
                }
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteDashboard(state.selectedDashboard!)}
                variant="primary"
                size="sm"
                disabled={state.operationInProgress === 'delete'}
                className="bg-red-600 hover:bg-red-700"
              >
                {state.operationInProgress === 'delete'
                  ? 'Deleting...'
                  : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {state.showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Import Dashboard
            </h3>
            <div className="mb-4">
              <label
                htmlFor="import-data"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Dashboard JSON Data
              </label>
              <textarea
                id="import-data"
                value={state.importData}
                onChange={e =>
                  setState(prev => ({ ...prev, importData: e.target.value }))
                }
                placeholder="Paste your dashboard export data here..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() =>
                  setState(prev => ({
                    ...prev,
                    showImportModal: false,
                    importData: '',
                  }))
                }
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportDashboard}
                variant="primary"
                size="sm"
                disabled={
                  !state.importData.trim() ||
                  state.operationInProgress === 'import'
                }
              >
                {state.operationInProgress === 'import'
                  ? 'Importing...'
                  : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {state.selectedDashboard && (
        <div
          className="fixed inset-0 z-0"
          onClick={() =>
            setState(prev => ({ ...prev, selectedDashboard: null }))
          }
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setState(prev => ({ ...prev, selectedDashboard: null }));
            }
          }}
          tabIndex={-1}
          role="button"
          aria-label="Close dropdown"
        />
      )}
    </div>
  );
};

export default DashboardManager;
