/**
 * Default Dashboard Provider Component
 * Handles automatic provisioning of owner-configured default dashboards
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useUserStore } from '@/stores/userStore';
import { templateService, SYSTEM_TEMPLATES } from '@/services/templateService';
import { dashboardService } from '@/services/dashboardService';
import type { Dashboard, DashboardTemplate } from '@/types/dashboard';
import { logger } from '@/utils/logger';

export interface DefaultDashboardProviderProps {
  /** Children to render */
  children: React.ReactNode;
  /** Whether to auto-provision defaults on mount */
  autoProvision?: boolean;
  /** Whether to show provisioning status */
  showStatus?: boolean;
}

interface ProvisioningStatus {
  isProvisioning: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  completed: boolean;
}

export const DefaultDashboardProvider: React.FC<
  DefaultDashboardProviderProps
> = ({ children, autoProvision = true, showStatus = false }) => {
  const {
    dashboards,
    defaultDashboards,
    loadDefaultDashboards,
    setError,
    clearError,
  } = useDashboardStore();

  const { user } = useUserStore();

  const [provisioningStatus, setProvisioningStatus] =
    useState<ProvisioningStatus>({
      isProvisioning: false,
      progress: 0,
      currentStep: '',
      error: null,
      completed: false,
    });

  /**
   * Check if user needs default dashboards
   */
  const needsDefaultDashboards = useCallback((): boolean => {
    // New users with no dashboards need defaults
    if (dashboards.length === 0 && defaultDashboards.length === 0) {
      return true;
    }

    // Users with no default dashboards need them
    if (defaultDashboards.length === 0) {
      return true;
    }

    return false;
  }, [dashboards.length, defaultDashboards.length]);

  /**
   * Provision default dashboards from system templates
   */
  const provisionDefaultDashboards = useCallback(async (): Promise<void> => {
    if (!user || !needsDefaultDashboards()) {
      return;
    }

    setProvisioningStatus({
      isProvisioning: true,
      progress: 0,
      currentStep: 'Initializing default dashboard provisioning...',
      error: null,
      completed: false,
    });

    try {
      clearError();

      // Step 1: Load system templates
      setProvisioningStatus(prev => ({
        ...prev,
        progress: 20,
        currentStep: 'Loading system templates...',
      }));

      const templatesResponse = await templateService.getSystemTemplates();
      let templates: DashboardTemplate[] = [];

      if (templatesResponse.success && templatesResponse.data) {
        templates = templatesResponse.data;
      } else {
        // Fallback to predefined templates
        logger.warn(
          'Failed to load system templates, using predefined templates'
        );
        templates = SYSTEM_TEMPLATES.map((template, index) => ({
          ...template,
          id: `system-template-${index}`,
          createdAt: new Date(),
          createdBy: 'system',
        }));
      }

      // Step 2: Select templates for default dashboards
      setProvisioningStatus(prev => ({
        ...prev,
        progress: 40,
        currentStep: 'Selecting default templates...',
      }));

      // Select the most popular templates for defaults
      const defaultTemplates = templates
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 2); // Provision top 2 templates as defaults

      if (defaultTemplates.length === 0) {
        throw new Error(
          'No templates available for default dashboard provisioning'
        );
      }

      // Step 3: Create dashboards from templates
      setProvisioningStatus(prev => ({
        ...prev,
        progress: 60,
        currentStep: 'Creating default dashboards...',
      }));

      const createdDashboards: Dashboard[] = [];

      for (let i = 0; i < defaultTemplates.length; i++) {
        const template = defaultTemplates[i];

        setProvisioningStatus(prev => ({
          ...prev,
          progress: 60 + (i / defaultTemplates.length) * 30,
          currentStep: `Creating "${template.name}" dashboard...`,
        }));

        try {
          const response = await dashboardService.createFromTemplate(
            template.id,
            template.name,
            template.config
          );

          if (response.success && response.data) {
            // Mark as default dashboard
            const defaultDashboard = {
              ...response.data,
              isDefault: true,
              isPublic: true,
            };

            // Update the dashboard to mark it as default
            const updateResponse = await dashboardService.updateDashboard(
              defaultDashboard.id,
              { isDefault: true, isPublic: true }
            );

            if (updateResponse.success && updateResponse.data) {
              createdDashboards.push(updateResponse.data);
            } else {
              createdDashboards.push(defaultDashboard);
            }
          } else {
            logger.warn(
              `Failed to create dashboard from template: ${template.name}`,
              {
                error: response.error,
              }
            );
          }
        } catch (error) {
          logger.error(
            `Error creating dashboard from template: ${template.name}`,
            {
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          );
        }
      }

      // Step 4: Reload default dashboards
      setProvisioningStatus(prev => ({
        ...prev,
        progress: 90,
        currentStep: 'Finalizing default dashboards...',
      }));

      await loadDefaultDashboards();

      // Step 5: Complete
      setProvisioningStatus({
        isProvisioning: false,
        progress: 100,
        currentStep: `Successfully provisioned ${createdDashboards.length} default dashboards`,
        error: null,
        completed: true,
      });

      logger.info('Default dashboards provisioned successfully', {
        userId: user.id,
        dashboardCount: createdDashboards.length,
        dashboards: createdDashboards.map(d => ({ id: d.id, name: d.name })),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      setProvisioningStatus({
        isProvisioning: false,
        progress: 0,
        currentStep: '',
        error: errorMessage,
        completed: false,
      });

      setError(`Failed to provision default dashboards: ${errorMessage}`);

      logger.error('Error provisioning default dashboards', {
        error: errorMessage,
        userId: user?.id,
      });
    }
  }, [
    user,
    needsDefaultDashboards,
    loadDefaultDashboards,
    setError,
    clearError,
  ]);

  /**
   * Auto-provision defaults on mount if needed
   */
  useEffect(() => {
    if (
      autoProvision &&
      user &&
      needsDefaultDashboards() &&
      !provisioningStatus.isProvisioning
    ) {
      const timer = setTimeout(() => {
        provisionDefaultDashboards();
      }, 1000); // Small delay to allow other initialization

      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [
    autoProvision,
    user,
    needsDefaultDashboards,
    provisionDefaultDashboards,
    provisioningStatus.isProvisioning,
  ]);

  /**
   * Clear completed status after delay
   */
  useEffect(() => {
    if (provisioningStatus.completed) {
      const timer = setTimeout(() => {
        setProvisioningStatus(prev => ({
          ...prev,
          completed: false,
          currentStep: '',
        }));
      }, 3000);

      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [provisioningStatus.completed]);

  return (
    <>
      {children}

      {/* Provisioning Status Overlay */}
      {showStatus && provisioningStatus.isProvisioning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Setting Up Your Dashboard
              </h3>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${provisioningStatus.progress}%` }}
                />
              </div>

              {/* Current Step */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {provisioningStatus.currentStep}
              </p>

              {/* Progress Percentage */}
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {Math.round(provisioningStatus.progress)}% complete
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showStatus && provisioningStatus.completed && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">{provisioningStatus.currentStep}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {showStatus && provisioningStatus.error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">Error: {provisioningStatus.error}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default DefaultDashboardProvider;
