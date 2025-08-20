/**
 * Template Service
 * Handles dashboard template management and default dashboard provisioning
 */

import { apiClient } from './apiClient';
import type {
  Dashboard,
  DashboardTemplate,
  DashboardTemplateConfig,
  TemplateCategory,
} from '@/types/dashboard';
import type { ApiResponse } from '@/types/api';

export interface DefaultDashboardConfig {
  /** Template ID to use */
  templateId: string;
  /** Dashboard name */
  name: string;
  /** Dashboard description */
  description?: string;
  /** Whether this should be the primary default */
  isPrimary?: boolean;
  /** User roles that should receive this dashboard */
  targetRoles?: string[];
  /** Custom configuration overrides */
  customizations?: Partial<DashboardTemplateConfig>;
}

export interface TemplateDeploymentConfig {
  /** Templates to deploy as defaults */
  defaultTemplates: DefaultDashboardConfig[];
  /** Whether to update existing default dashboards */
  updateExisting: boolean;
  /** Whether to notify users of new defaults */
  notifyUsers: boolean;
}

export class TemplateService {
  /**
   * Get predefined system templates
   */
  async getSystemTemplates(): Promise<ApiResponse<DashboardTemplate[]>> {
    return apiClient.get<DashboardTemplate[]>('/templates/system');
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: TemplateCategory
  ): Promise<ApiResponse<DashboardTemplate[]>> {
    return apiClient.get<DashboardTemplate[]>(
      `/templates/category/${encodeURIComponent(category)}`
    );
  }

  /**
   * Create template from existing dashboard
   */
  async createTemplateFromDashboard(
    dashboardId: string,
    templateData: Omit<
      DashboardTemplate,
      'id' | 'createdAt' | 'popularity' | 'config'
    >
  ): Promise<ApiResponse<DashboardTemplate>> {
    return apiClient.post<DashboardTemplate>('/templates/from-dashboard', {
      dashboardId,
      ...templateData,
    });
  }

  /**
   * Deploy templates as default dashboards
   */
  async deployDefaultDashboards(
    config: TemplateDeploymentConfig
  ): Promise<ApiResponse<Dashboard[]>> {
    return apiClient.post<Dashboard[]>('/templates/deploy-defaults', config);
  }

  /**
   * Get default dashboard configuration
   */
  async getDefaultDashboardConfig(): Promise<
    ApiResponse<DefaultDashboardConfig[]>
  > {
    return apiClient.get<DefaultDashboardConfig[]>('/templates/default-config');
  }

  /**
   * Update default dashboard configuration
   */
  async updateDefaultDashboardConfig(
    config: DefaultDashboardConfig[]
  ): Promise<ApiResponse<DefaultDashboardConfig[]>> {
    return apiClient.put<DefaultDashboardConfig[]>(
      '/templates/default-config',
      {
        config,
      }
    );
  }

  /**
   * Provision default dashboards for a user
   */
  async provisionUserDefaults(
    userId?: string,
    roles?: string[]
  ): Promise<ApiResponse<Dashboard[]>> {
    return apiClient.post<Dashboard[]>('/templates/provision-user', {
      userId,
      roles,
    });
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<
    ApiResponse<{
      usageCount: number;
      popularityScore: number;
      recentUsage: Array<{ date: string; count: number }>;
    }>
  > {
    return apiClient.get(`/templates/${encodeURIComponent(templateId)}/stats`);
  }

  /**
   * Validate template configuration
   */
  async validateTemplate(config: DashboardTemplateConfig): Promise<
    ApiResponse<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }>
  > {
    return apiClient.post('/templates/validate', { config });
  }

  /**
   * Get template preview
   */
  async getTemplatePreview(
    templateId: string,
    customizations?: Partial<DashboardTemplateConfig>
  ): Promise<
    ApiResponse<{
      preview: Dashboard;
      estimatedWidgets: number;
      requiredDataSources: string[];
    }>
  > {
    return apiClient.post(
      `/templates/${encodeURIComponent(templateId)}/preview`,
      {
        customizations,
      }
    );
  }
}

/**
 * Predefined system templates
 */
export const SYSTEM_TEMPLATES: Omit<
  DashboardTemplate,
  'id' | 'createdAt' | 'createdBy'
>[] = [
  {
    name: 'Market Overview',
    description:
      'Comprehensive market overview with major indices, trending stocks, and market sentiment',
    category: 'trading',
    tags: ['market', 'overview', 'indices', 'sentiment'],
    popularity: 95,
    config: {
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
      widgets: [
        {
          type: 'market-summary',
          title: 'Market Summary',
          config: {
            indices: ['SPY', 'QQQ', 'IWM', 'DIA'],
            showPreMarket: true,
            showAfterHours: true,
          },
          position: { x: 0, y: 0, w: 6, h: 3 },
          size: { minW: 4, minH: 2, maxW: 8, maxH: 4, resizable: true },
        },
        {
          type: 'trending-stocks',
          title: 'Trending Stocks',
          config: {
            count: 10,
            timeframe: '1D',
            sortBy: 'volume',
          },
          position: { x: 6, y: 0, w: 6, h: 3 },
          size: { minW: 4, minH: 2, maxW: 8, maxH: 4, resizable: true },
        },
        {
          type: 'market-sentiment',
          title: 'Market Sentiment',
          config: {
            indicators: ['fear-greed', 'vix', 'put-call-ratio'],
            showHistory: true,
          },
          position: { x: 0, y: 3, w: 4, h: 3 },
          size: { minW: 3, minH: 2, maxW: 6, maxH: 4, resizable: true },
        },
        {
          type: 'news-feed',
          title: 'Market News',
          config: {
            sources: ['reuters', 'bloomberg', 'cnbc'],
            maxArticles: 10,
            autoRefresh: true,
          },
          position: { x: 4, y: 3, w: 8, h: 3 },
          size: { minW: 6, minH: 2, maxW: 12, maxH: 4, resizable: true },
        },
      ],
      dataSources: ['yahoo-finance', 'google-finance', 'news-api'],
    },
  },
  {
    name: 'Sector Analysis',
    description:
      'Detailed sector performance analysis with heatmaps and sector rotation indicators',
    category: 'analysis',
    tags: ['sector', 'analysis', 'heatmap', 'rotation'],
    popularity: 78,
    config: {
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
        minWidgetSize: { width: 3, height: 2 },
        maxWidgetSize: { width: 12, height: 6 },
      },
      widgets: [
        {
          type: 'sector-heatmap',
          title: 'Sector Performance Heatmap',
          config: {
            timeframe: '1D',
            showLabels: true,
            colorScheme: 'red-green',
          },
          position: { x: 0, y: 0, w: 8, h: 4 },
          size: { minW: 6, minH: 3, maxW: 12, maxH: 6, resizable: true },
        },
        {
          type: 'sector-rotation',
          title: 'Sector Rotation',
          config: {
            timeframe: '3M',
            showTrend: true,
          },
          position: { x: 8, y: 0, w: 4, h: 4 },
          size: { minW: 3, minH: 3, maxW: 6, maxH: 6, resizable: true },
        },
        {
          type: 'top-sectors',
          title: 'Top Performing Sectors',
          config: {
            count: 5,
            timeframe: '1D',
            showChange: true,
          },
          position: { x: 0, y: 4, w: 6, h: 4 },
          size: { minW: 4, minH: 3, maxW: 8, maxH: 6, resizable: true },
        },
        {
          type: 'sector-news',
          title: 'Sector News',
          config: {
            sectors: ['technology', 'healthcare', 'finance'],
            maxArticles: 8,
          },
          position: { x: 6, y: 4, w: 6, h: 4 },
          size: { minW: 4, minH: 3, maxW: 8, maxH: 6, resizable: true },
        },
      ],
      dataSources: ['yahoo-finance', 'sector-data-api'],
    },
  },
  {
    name: 'News & Sentiment Dashboard',
    description:
      'Real-time news aggregation with sentiment analysis and market impact indicators',
    category: 'news',
    tags: ['news', 'sentiment', 'analysis', 'real-time'],
    popularity: 82,
    config: {
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
        minWidgetSize: { width: 3, height: 2 },
        maxWidgetSize: { width: 9, height: 6 },
      },
      widgets: [
        {
          type: 'breaking-news',
          title: 'Breaking News',
          config: {
            sources: ['reuters', 'bloomberg', 'ap'],
            maxArticles: 5,
            autoRefresh: true,
            refreshInterval: 60,
          },
          position: { x: 0, y: 0, w: 6, h: 3 },
          size: { minW: 4, minH: 2, maxW: 8, maxH: 4, resizable: true },
        },
        {
          type: 'sentiment-gauge',
          title: 'Market Sentiment',
          config: {
            timeframe: '1D',
            showHistory: true,
            indicators: ['fear-greed', 'social-sentiment'],
          },
          position: { x: 6, y: 0, w: 3, h: 3 },
          size: { minW: 3, minH: 3, maxW: 4, maxH: 4, resizable: true },
        },
        {
          type: 'trending-topics',
          title: 'Trending Topics',
          config: {
            count: 10,
            timeframe: '1H',
            showVolume: true,
          },
          position: { x: 9, y: 0, w: 3, h: 3 },
          size: { minW: 3, minH: 3, maxW: 4, maxH: 4, resizable: true },
        },
        {
          type: 'news-impact',
          title: 'News Impact Analysis',
          config: {
            showPriceCorrelation: true,
            timeframe: '1D',
          },
          position: { x: 0, y: 3, w: 8, h: 5 },
          size: { minW: 6, minH: 4, maxW: 10, maxH: 6, resizable: true },
        },
        {
          type: 'social-sentiment',
          title: 'Social Media Sentiment',
          config: {
            platforms: ['twitter', 'reddit'],
            keywords: ['$SPY', '$QQQ', 'market'],
          },
          position: { x: 8, y: 3, w: 4, h: 5 },
          size: { minW: 3, minH: 4, maxW: 6, maxH: 6, resizable: true },
        },
      ],
      dataSources: ['news-api', 'sentiment-api', 'social-api'],
    },
  },
  {
    name: 'Performance Tracking',
    description:
      'Portfolio performance tracking with detailed analytics and benchmarking',
    category: 'investing',
    tags: ['portfolio', 'performance', 'analytics', 'tracking'],
    popularity: 71,
    config: {
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
        minWidgetSize: { width: 3, height: 2 },
        maxWidgetSize: { width: 8, height: 6 },
      },
      widgets: [
        {
          type: 'portfolio-summary',
          title: 'Portfolio Summary',
          config: {
            showTotalValue: true,
            showDayChange: true,
            showAllTimeReturn: true,
          },
          position: { x: 0, y: 0, w: 4, h: 2 },
          size: { minW: 4, minH: 2, maxW: 8, maxH: 4, resizable: true },
        },
        {
          type: 'performance-chart',
          title: 'Performance Chart',
          config: {
            timeframe: '1Y',
            showBenchmark: true,
            benchmark: 'SPY',
          },
          position: { x: 4, y: 0, w: 8, h: 4 },
          size: { minW: 8, minH: 4, maxW: 12, maxH: 6, resizable: true },
        },
        {
          type: 'asset-allocation',
          title: 'Asset Allocation',
          config: {
            chartType: 'pie',
            showPercentages: true,
          },
          position: { x: 0, y: 2, w: 4, h: 3 },
          size: { minW: 4, minH: 3, maxW: 6, maxH: 5, resizable: true },
        },
        {
          type: 'top-performers',
          title: 'Top Performers',
          config: {
            count: 5,
            timeframe: '1D',
            showChange: true,
          },
          position: { x: 0, y: 5, w: 6, h: 3 },
          size: { minW: 6, minH: 3, maxW: 8, maxH: 5, resizable: true },
        },
        {
          type: 'risk-metrics',
          title: 'Risk Metrics',
          config: {
            showSharpeRatio: true,
            showVolatility: true,
            showMaxDrawdown: true,
          },
          position: { x: 6, y: 5, w: 6, h: 3 },
          size: { minW: 6, minH: 3, maxW: 8, maxH: 5, resizable: true },
        },
      ],
      dataSources: ['portfolio-api', 'yahoo-finance'],
    },
  },
];

/**
 * Default service instance
 */
export const templateService = new TemplateService();
