/**
 * Template Manager Component
 * Administrative interface for managing dashboard templates and default configurations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  templateService,
  SYSTEM_TEMPLATES,
  type DefaultDashboardConfig,
} from '@/services/templateService';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { DashboardTemplate, TemplateCategory } from '@/types/dashboard';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { logger } from '@/utils/logger';

export interface TemplateManagerProps {
  /** Whether user has admin privileges */
  isAdmin?: boolean;
  /** Callback when template is selected */
  onTemplateSelect?: (template: DashboardTemplate) => void;
  /** Whether to show admin controls */
  showAdminControls?: boolean;
}

interface TemplateManagerState {
  templates: DashboardTemplate[];
  defaultConfig: DefaultDashboardConfig[];
  selectedCategory: TemplateCategory | 'all';
  isLoading: boolean;
  error: string | null;
  isDeploying: boolean;
  deploymentStatus: string;
}

const TEMPLATE_CATEGORIES: {
  value: TemplateCategory | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All Templates' },
  { value: 'trading', label: 'Trading' },
  { value: 'investing', label: 'Investing' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'forex', label: 'Forex' },
  { value: 'commodities', label: 'Commodities' },
  { value: 'indices', label: 'Indices' },
  { value: 'news', label: 'News & Analysis' },
  { value: 'analysis', label: 'Technical Analysis' },
  { value: 'custom', label: 'Custom' },
];

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  isAdmin = false,
  onTemplateSelect,
  showAdminControls = false,
}) => {
  const { createFromTemplate } = useDashboardStore();

  const [state, setState] = useState<TemplateManagerState>({
    templates: [],
    defaultConfig: [],
    selectedCategory: 'all',
    isLoading: false,
    error: null,
    isDeploying: false,
    deploymentStatus: '',
  });

  /**
   * Load templates from API
   */
  const loadTemplatesData = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await templateService.getSystemTemplates();

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          templates: response.data,
          isLoading: false,
        }));
      } else {
        // Fallback to predefined templates
        const fallbackTemplates: DashboardTemplate[] = SYSTEM_TEMPLATES.map(
          (template, index) => ({
            ...template,
            id: `system-template-${index}`,
            createdAt: new Date(),
            createdBy: 'system',
          })
        );

        setState(prev => ({
          ...prev,
          templates: fallbackTemplates,
          isLoading: false,
        }));

        logger.warn('Using fallback templates', {
          error: response.error,
          fallbackCount: fallbackTemplates.length,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load templates';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));

      logger.error('Error loading templates', { error: errorMessage });
    }
  }, []);

  /**
   * Load default dashboard configuration
   */
  const loadDefaultConfig = useCallback(async (): Promise<void> => {
    if (!isAdmin) return;

    try {
      const response = await templateService.getDefaultDashboardConfig();

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          defaultConfig: response.data,
        }));
      }
    } catch (error) {
      logger.error('Error loading default config', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [isAdmin]);

  /**
   * Deploy templates as default dashboards
   */
  const deployDefaultDashboards = useCallback(async (): Promise<void> => {
    if (!isAdmin) return;

    setState(prev => ({
      ...prev,
      isDeploying: true,
      deploymentStatus: 'Preparing deployment...',
    }));

    try {
      // Select top templates for deployment
      const topTemplates = state.templates
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 2);

      const deploymentConfig = {
        defaultTemplates: topTemplates.map(template => ({
          templateId: template.id,
          name: template.name,
          description: template.description,
          isPrimary: template.popularity > 90,
        })),
        updateExisting: true,
        notifyUsers: false,
      };

      setState(prev => ({
        ...prev,
        deploymentStatus: 'Deploying default dashboards...',
      }));

      const response =
        await templateService.deployDefaultDashboards(deploymentConfig);

      if (response.success) {
        setState(prev => ({
          ...prev,
          isDeploying: false,
          deploymentStatus: 'Deployment completed successfully',
        }));

        // Reload templates to reflect changes
        await loadTemplatesData();
        await loadDefaultConfig();

        logger.info('Default dashboards deployed successfully', {
          templateCount: topTemplates.length,
        });
      } else {
        throw new Error(response.error || 'Deployment failed');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Deployment failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isDeploying: false,
        deploymentStatus: '',
      }));

      logger.error('Error deploying default dashboards', {
        error: errorMessage,
      });
    }
  }, [isAdmin, state.templates, loadTemplatesData, loadDefaultConfig]);

  /**
   * Handle template selection
   */
  const handleTemplateSelect = useCallback(
    (template: DashboardTemplate): void => {
      onTemplateSelect?.(template);
    },
    [onTemplateSelect]
  );

  /**
   * Create dashboard from template
   */
  const handleCreateFromTemplate = useCallback(
    async (template: DashboardTemplate): Promise<void> => {
      try {
        const dashboard = await createFromTemplate(
          template.id,
          `${template.name} Dashboard`
        );

        if (dashboard) {
          logger.info('Dashboard created from template', {
            templateId: template.id,
            templateName: template.name,
            dashboardId: dashboard.id,
          });
        }
      } catch (error) {
        logger.error('Error creating dashboard from template', {
          templateId: template.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [createFromTemplate]
  );

  /**
   * Filter templates by category
   */
  const filteredTemplates = state.templates.filter(
    template =>
      state.selectedCategory === 'all' ||
      template.category === state.selectedCategory
  );

  /**
   * Load data on mount
   */
  useEffect(() => {
    loadTemplatesData();
    loadDefaultConfig();
  }, [loadTemplatesData, loadDefaultConfig]);

  /**
   * Clear deployment status after delay
   */
  useEffect(() => {
    if (state.deploymentStatus && !state.isDeploying) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, deploymentStatus: '' }));
      }, 3000);

      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [state.deploymentStatus, state.isDeploying]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loading text="Loading templates..." />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 dark:text-red-400">
          <h3 className="text-lg font-semibold mb-2">
            Error Loading Templates
          </h3>
          <p className="text-sm">{state.error}</p>
        </div>
        <Button onClick={loadTemplatesData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="template-manager p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Templates
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Choose from pre-built dashboard templates or create your own
          </p>
        </div>

        {/* Admin Controls */}
        {showAdminControls && isAdmin && (
          <div className="flex space-x-2">
            <Button
              onClick={deployDefaultDashboards}
              disabled={state.isDeploying}
              variant="primary"
            >
              {state.isDeploying ? 'Deploying...' : 'Deploy Defaults'}
            </Button>
          </div>
        )}
      </div>

      {/* Deployment Status */}
      {state.deploymentStatus && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {state.deploymentStatus}
          </p>
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_CATEGORIES.map(category => (
            <button
              key={category.value}
              onClick={() =>
                setState(prev => ({
                  ...prev,
                  selectedCategory: category.value,
                }))
              }
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                state.selectedCategory === category.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="template-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleTemplateSelect(template)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTemplateSelect(template);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Select ${template.name} template`}
          >
            {/* Template Preview */}
            {template.previewImage && (
              <div className="mb-4">
                <img
                  src={template.previewImage}
                  alt={`${template.name} preview`}
                  className="w-full h-32 object-cover rounded-md"
                />
              </div>
            )}

            {/* Template Info */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {template.description}
              </p>

              {/* Template Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {template.tags.slice(0, 3).map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {template.tags.length > 3 && (
                  <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-500">
                    +{template.tags.length - 3} more
                  </span>
                )}
              </div>

              {/* Popularity Score */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-500">
                  Popularity: {template.popularity}%
                </span>
                <span className="text-gray-500 dark:text-gray-500 capitalize">
                  {template.category}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button
                onClick={e => {
                  e.stopPropagation();
                  handleCreateFromTemplate(template);
                }}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                Use Template
              </Button>
              <Button
                onClick={e => {
                  e.stopPropagation();
                  handleTemplateSelect(template);
                }}
                variant="secondary"
                size="sm"
              >
                Preview
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
            <p className="text-sm">
              {state.selectedCategory === 'all'
                ? 'No templates are available at the moment.'
                : `No templates found in the ${state.selectedCategory} category.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
