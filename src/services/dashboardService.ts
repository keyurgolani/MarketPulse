/**
 * Dashboard Service
 * Handles dashboard and user-related API calls
 */

import { apiClient } from './apiClient';
import type { Dashboard } from '@/types/dashboard';
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
    return apiClient.post<Dashboard>('/dashboards', dashboard);
  }

  /**
   * Update existing dashboard
   */
  async updateDashboard(
    id: string,
    updates: Partial<Dashboard>
  ): Promise<ApiResponse<Dashboard>> {
    return apiClient.put<Dashboard>(
      `/dashboards/${encodeURIComponent(id)}`,
      updates
    );
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/dashboards/${encodeURIComponent(id)}`);
  }

  /**
   * Get system default dashboards
   */
  async getDefaultDashboards(): Promise<ApiResponse<Dashboard[]>> {
    return apiClient.get<Dashboard[]>('/dashboards/defaults');
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

/**
 * Default service instances
 */
export const dashboardService = new DashboardService();
export const userService = new UserService();
