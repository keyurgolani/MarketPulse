/**
 * Dashboard Service
 * Handles dashboard and user-related API calls
 */

import { apiClient } from './apiClient';
import { webSocketService } from './webSocketService';
import type { DashboardChangeEvent } from './webSocketService';
import type {
  Dashboard,
  DashboardTemplate,
  DashboardTemplateConfig,
} from '@/types/dashboard';
import type { User, UserPreferences } from '@/types/user';
import type { ApiResponse } from '@/types/api';

export class DashboardService {
  /**
   * Get all dashboards for current user
   */
  async getDashboards(): Promise<ApiResponse<Dashboard[]>> {
    return apiClient.get<Dashboard[]>('/dashboards');
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(id: string): Promise<ApiResponse<Dashboard>> {
    return apiClient.get<Dashboard>(`/dashboards/${encodeURIComponent(id)}`);
  }

  /**
   * Create new dashboard
   */
  async createDashboard(
    dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<Dashboard>> {
    const response = await apiClient.post<Dashboard>('/dashboards', dashboard);

    // Broadcast change via WebSocket if successful
    if (response.success && response.data) {
      const changeEvent: DashboardChangeEvent = {
        type: 'dashboard_created',
        dashboardId: response.data.id,
        userId: 'default-user', // TODO: Get from user store
        data: response.data,
        timestamp: Date.now(),
      };
      webSocketService.broadcastDashboardChange(changeEvent);
    }

    return response;
  }

  /**
   * Update existing dashboard
   */
  async updateDashboard(
    id: string,
    updates: Partial<Dashboard>
  ): Promise<ApiResponse<Dashboard>> {
    const response = await apiClient.put<Dashboard>(
      `/dashboards/${encodeURIComponent(id)}`,
      updates
    );

    // Broadcast change via WebSocket if successful
    if (response.success && response.data) {
      const changeEvent: DashboardChangeEvent = {
        type: 'dashboard_updated',
        dashboardId: id,
        userId: 'default-user', // TODO: Get from user store
        data: response.data,
        timestamp: Date.now(),
      };
      webSocketService.broadcastDashboardChange(changeEvent);
    }

    return response;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await apiClient.delete<{ message: string }>(
      `/dashboards/${encodeURIComponent(id)}`
    );

    // Broadcast change via WebSocket if successful
    if (response.success) {
      const changeEvent: DashboardChangeEvent = {
        type: 'dashboard_deleted',
        dashboardId: id,
        userId: 'default-user', // TODO: Get from user store
        data: { id },
        timestamp: Date.now(),
      };
      webSocketService.broadcastDashboardChange(changeEvent);
    }

    return response;
  }

  /**
   * Get system default dashboards
   */
  async getDefaultDashboards(): Promise<ApiResponse<Dashboard[]>> {
    return apiClient.get<Dashboard[]>('/dashboards/default');
  }

  /**
   * Get all dashboard templates
   */
  async getTemplates(): Promise<ApiResponse<DashboardTemplate[]>> {
    return apiClient.get<DashboardTemplate[]>('/dashboards/templates');
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<ApiResponse<DashboardTemplate>> {
    return apiClient.get<DashboardTemplate>(
      `/dashboards/templates/${encodeURIComponent(id)}`
    );
  }

  /**
   * Create dashboard from template
   */
  async createFromTemplate(
    templateId: string,
    name: string,
    customizations?: Partial<DashboardTemplateConfig>
  ): Promise<ApiResponse<Dashboard>> {
    return apiClient.post<Dashboard>('/dashboards/from-template', {
      templateId,
      name,
      customizations,
    });
  }

  /**
   * Create new template (admin only)
   */
  async createTemplate(
    template: Omit<DashboardTemplate, 'id' | 'createdAt' | 'popularity'>
  ): Promise<ApiResponse<DashboardTemplate>> {
    return apiClient.post<DashboardTemplate>('/dashboards/templates', template);
  }

  /**
   * Update template (admin only)
   */
  async updateTemplate(
    id: string,
    updates: Partial<DashboardTemplate>
  ): Promise<ApiResponse<DashboardTemplate>> {
    return apiClient.put<DashboardTemplate>(
      `/dashboards/templates/${encodeURIComponent(id)}`,
      updates
    );
  }

  /**
   * Delete template (admin only)
   */
  async deleteTemplate(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/dashboards/templates/${encodeURIComponent(id)}`);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(
    category: string
  ): Promise<ApiResponse<DashboardTemplate[]>> {
    return apiClient.get<DashboardTemplate[]>(
      `/dashboards/templates/category/${encodeURIComponent(category)}`
    );
  }

  /**
   * Search templates
   */
  async searchTemplates(
    query: string
  ): Promise<ApiResponse<DashboardTemplate[]>> {
    return apiClient.get<DashboardTemplate[]>(
      `/dashboards/templates/search?q=${encodeURIComponent(query)}`
    );
  }

  /**
   * Provision default dashboards for user (system use)
   */
  async provisionDefaultDashboards(
    userId?: string
  ): Promise<ApiResponse<Dashboard[]>> {
    return apiClient.post<Dashboard[]>('/dashboards/provision-defaults', {
      userId,
    });
  }
}

export class UserService {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/user/profile');
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse<UserPreferences>> {
    return apiClient.put<UserPreferences>('/user/preferences', preferences);
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<ApiResponse<UserPreferences>> {
    return apiClient.get<UserPreferences>('/user/preferences');
  }
}

export class SharingService {
  /**
   * Create share token for dashboard
   */
  async createShareToken(
    dashboardId: string,
    options: {
      permissions?: 'view' | 'edit';
      expiresAt?: Date;
      maxAccessCount?: number;
    } = {}
  ): Promise<
    ApiResponse<{
      id: string;
      token: string;
      permissions: 'view' | 'edit';
      expiresAt: string | null;
      maxAccessCount: number | null;
      shareUrl: string;
    }>
  > {
    const payload: Record<string, unknown> = {
      permissions: options.permissions || 'view',
    };

    if (options.expiresAt) {
      payload.expiresAt = options.expiresAt.toISOString();
    }

    if (options.maxAccessCount) {
      payload.maxAccessCount = options.maxAccessCount;
    }

    return apiClient.post(
      `/dashboards/${encodeURIComponent(dashboardId)}/share`,
      payload
    );
  }

  /**
   * Get share tokens for dashboard
   */
  async getShareTokens(dashboardId: string): Promise<
    ApiResponse<{
      tokens: Array<{
        id: string;
        token: string;
        permissions: 'view' | 'edit';
        expiresAt: string | null;
        maxAccessCount: number | null;
        accessCount: number;
        isActive: boolean;
        createdAt: string;
        shareUrl: string;
      }>;
      stats: {
        totalTokens: number;
        activeTokens: number;
        totalAccess: number;
        recentAccess: number;
      };
    }>
  > {
    return apiClient.get(
      `/dashboards/${encodeURIComponent(dashboardId)}/share`
    );
  }

  /**
   * Revoke share token
   */
  async revokeShareToken(
    dashboardId: string,
    tokenId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(
      `/dashboards/${encodeURIComponent(dashboardId)}/share/${encodeURIComponent(tokenId)}`
    );
  }

  /**
   * Grant user permission for dashboard
   */
  async grantUserPermission(
    dashboardId: string,
    userId: string,
    permission: 'view' | 'edit' | 'admin',
    expiresAt?: Date
  ): Promise<
    ApiResponse<{
      id: string;
      userId: string;
      permission: 'view' | 'edit' | 'admin';
      grantedBy: string;
      grantedAt: string;
      expiresAt: string | null;
    }>
  > {
    const payload: Record<string, unknown> = {
      userId,
      permission,
    };

    if (expiresAt) {
      payload.expiresAt = expiresAt.toISOString();
    }

    return apiClient.post(
      `/dashboards/${encodeURIComponent(dashboardId)}/permissions`,
      payload
    );
  }

  /**
   * Get user permissions for dashboard
   */
  async getUserPermissions(dashboardId: string): Promise<
    ApiResponse<{
      permissions: Array<{
        id: string;
        userId: string;
        permission: 'view' | 'edit' | 'admin';
        grantedBy: string;
        grantedAt: string;
        expiresAt: string | null;
        isActive: boolean;
      }>;
      stats: {
        totalUsers: number;
        viewUsers: number;
        editUsers: number;
        adminUsers: number;
        expiredPermissions: number;
      };
    }>
  > {
    return apiClient.get(
      `/dashboards/${encodeURIComponent(dashboardId)}/permissions`
    );
  }

  /**
   * Revoke user permission for dashboard
   */
  async revokeUserPermission(
    dashboardId: string,
    userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(
      `/dashboards/${encodeURIComponent(dashboardId)}/permissions/${encodeURIComponent(userId)}`
    );
  }

  /**
   * Access shared dashboard via token
   */
  async accessSharedDashboard(token: string): Promise<
    ApiResponse<{
      dashboard: Dashboard;
      shareInfo: {
        permissions: 'view' | 'edit';
        accessCount: number;
        maxAccessCount: number | null;
        expiresAt: string | null;
      };
    }>
  > {
    return apiClient.get(`/shared/${encodeURIComponent(token)}`);
  }

  /**
   * Get embed code for dashboard
   */
  async getEmbedCode(
    dashboardId: string,
    options: {
      width?: string;
      height?: string;
      theme?: 'light' | 'dark' | 'auto';
      showHeader?: boolean;
      showControls?: boolean;
    } = {}
  ): Promise<
    ApiResponse<{
      embedUrl: string;
      embedCode: string;
      scriptCode: string;
      options: {
        width: string;
        height: string;
        theme: 'light' | 'dark' | 'auto';
        showHeader: boolean;
        showControls: boolean;
      };
      dashboard: {
        id: string;
        name: string;
        isPublic: boolean;
      };
    }>
  > {
    const params = new URLSearchParams();

    if (options.width) params.set('width', options.width);
    if (options.height) params.set('height', options.height);
    if (options.theme) params.set('theme', options.theme);
    if (options.showHeader !== undefined)
      params.set('showHeader', options.showHeader.toString());
    if (options.showControls !== undefined)
      params.set('showControls', options.showControls.toString());

    const queryString = params.toString();
    const url = `/dashboards/${encodeURIComponent(dashboardId)}/embed${queryString ? `?${queryString}` : ''}`;

    return apiClient.get(url);
  }
}

/**
 * Default service instances
 */
export const dashboardService = new DashboardService();
export const userService = new UserService();
