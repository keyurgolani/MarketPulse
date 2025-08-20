/**
 * Dashboard Persistence Service
 * Handles server-side dashboard persistence with caching and conflict resolution
 */

import {
  dashboardModel,
  type Dashboard,
  type CreateDashboardData,
  type UpdateDashboardData,
} from '../models/Dashboard';
import { CacheService } from './CacheService';
import { logger } from '../utils/logger';

export interface PersistenceOptions {
  useCache?: boolean;
  cacheTTL?: number;
  skipConflictCheck?: boolean;
}

export interface ConflictResolution {
  strategy: 'server' | 'client' | 'merge';
  resolvedData: Dashboard;
  conflictDetails?: {
    serverVersion: string;
    clientVersion: string;
    conflictFields: string[];
  };
}

class DashboardPersistenceService {
  private cacheService: CacheService;
  private readonly CACHE_PREFIX = 'dashboard:';
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor() {
    this.cacheService = CacheService.getInstance();
  }

  /**
   * Get cache key for dashboard
   */
  private getCacheKey(id: string): string {
    return `${this.CACHE_PREFIX}${id}`;
  }

  /**
   * Get cache key for user dashboards list
   */
  private getUserDashboardsKey(userId: string): string {
    return `${this.CACHE_PREFIX}user:${userId}:list`;
  }

  /**
   * Get cache key for default dashboards
   */
  private getDefaultDashboardsKey(): string {
    return `${this.CACHE_PREFIX}defaults`;
  }

  /**
   * Get dashboard with caching
   */
  async getDashboard(
    id: string,
    options: PersistenceOptions = {}
  ): Promise<Dashboard | null> {
    const { useCache = true, cacheTTL = this.DEFAULT_TTL } = options;

    try {
      // Try cache first if enabled
      if (useCache) {
        const cached = await this.cacheService.get<Dashboard>(
          this.getCacheKey(id)
        );
        if (cached) {
          logger.debug('Dashboard retrieved from cache', { id });
          return cached;
        }
      }

      // Get from database
      const dashboard = await dashboardModel.findById(id);

      if (dashboard && useCache) {
        // Cache the result
        await this.cacheService.set(this.getCacheKey(id), dashboard, cacheTTL);
        logger.debug('Dashboard cached', { id, ttl: cacheTTL });
      }

      return dashboard;
    } catch (error) {
      logger.error('Failed to get dashboard', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get dashboards for user with caching
   */
  async getUserDashboards(
    userId: string,
    includePublic: boolean = false,
    options: PersistenceOptions = {}
  ): Promise<Dashboard[]> {
    const { useCache = true, cacheTTL = this.DEFAULT_TTL } = options;
    const cacheKey = this.getUserDashboardsKey(userId);

    try {
      // Try cache first if enabled
      if (useCache) {
        const cached = await this.cacheService.get<Dashboard[]>(cacheKey);
        if (cached) {
          logger.debug('User dashboards retrieved from cache', {
            userId,
            count: cached.length,
          });
          return cached;
        }
      }

      // Get from database
      const dashboards = await dashboardModel.findByOwner(
        userId,
        includePublic
      );

      if (useCache) {
        // Cache the result
        await this.cacheService.set(cacheKey, dashboards, cacheTTL);
        logger.debug('User dashboards cached', {
          userId,
          count: dashboards.length,
          ttl: cacheTTL,
        });
      }

      return dashboards;
    } catch (error) {
      logger.error('Failed to get user dashboards', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get default dashboards with caching
   */
  async getDefaultDashboards(
    options: PersistenceOptions = {}
  ): Promise<Dashboard[]> {
    const { useCache = true, cacheTTL = this.DEFAULT_TTL * 2 } = options; // Longer TTL for defaults
    const cacheKey = this.getDefaultDashboardsKey();

    try {
      // Try cache first if enabled
      if (useCache) {
        const cached = await this.cacheService.get<Dashboard[]>(cacheKey);
        if (cached) {
          logger.debug('Default dashboards retrieved from cache', {
            count: cached.length,
          });
          return cached;
        }
      }

      // Get from database
      const dashboards = await dashboardModel.findDefaultDashboards();

      if (useCache) {
        // Cache the result
        await this.cacheService.set(cacheKey, dashboards, cacheTTL);
        logger.debug('Default dashboards cached', {
          count: dashboards.length,
          ttl: cacheTTL,
        });
      }

      return dashboards;
    } catch (error) {
      logger.error('Failed to get default dashboards', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create dashboard with caching
   */
  async createDashboard(
    data: CreateDashboardData,
    options: PersistenceOptions = {}
  ): Promise<Dashboard> {
    const { useCache = true, cacheTTL = this.DEFAULT_TTL } = options;

    try {
      // Create in database
      const dashboard = await dashboardModel.createDashboard(data);

      if (useCache) {
        // Cache the new dashboard
        await this.cacheService.set(
          this.getCacheKey(dashboard.id),
          dashboard,
          cacheTTL
        );

        // Invalidate user dashboards cache
        await this.cacheService.delete(
          this.getUserDashboardsKey(data.owner_id)
        );

        // Invalidate default dashboards cache if this is a default dashboard
        if (data.is_default) {
          await this.cacheService.delete(this.getDefaultDashboardsKey());
        }

        logger.debug('Dashboard created and cached', { id: dashboard.id });
      }

      return dashboard;
    } catch (error) {
      logger.error('Failed to create dashboard', {
        data,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update dashboard with conflict detection and caching
   */
  async updateDashboard(
    id: string,
    updates: UpdateDashboardData,
    clientVersion?: string,
    options: PersistenceOptions = {}
  ): Promise<Dashboard | null> {
    const {
      useCache = true,
      cacheTTL = this.DEFAULT_TTL,
      skipConflictCheck = false,
    } = options;

    try {
      // Get current dashboard for conflict detection
      const currentDashboard = await dashboardModel.findById(id);
      if (!currentDashboard) {
        return null;
      }

      // Check for conflicts if client version provided
      if (!skipConflictCheck && clientVersion) {
        const serverVersion = currentDashboard.updated_at;
        if (clientVersion !== serverVersion) {
          logger.warn('Dashboard update conflict detected', {
            id,
            clientVersion,
            serverVersion,
          });

          // For now, we'll proceed with server-wins strategy
          // In a full implementation, this would trigger conflict resolution
        }
      }

      // Prepare updates with proper typing - merge partial layout_config with existing
      const processedUpdates: Partial<Omit<Dashboard, 'id' | 'created_at'>> =
        {};

      // Copy simple fields
      if (updates.name !== undefined) processedUpdates.name = updates.name;
      if (updates.description !== undefined)
        processedUpdates.description = updates.description;
      if (updates.is_default !== undefined)
        processedUpdates.is_default = updates.is_default;
      if (updates.is_public !== undefined)
        processedUpdates.is_public = updates.is_public;

      // Handle layout_config merging if provided
      if (updates.layout_config) {
        processedUpdates.layout_config = {
          ...currentDashboard.layout_config,
          ...updates.layout_config,
        };
      }

      // Update in database
      const updatedDashboard = await dashboardModel.update(
        id,
        processedUpdates
      );

      if (updatedDashboard && useCache) {
        // Update cache
        await this.cacheService.set(
          this.getCacheKey(id),
          updatedDashboard,
          cacheTTL
        );

        // Invalidate user dashboards cache
        await this.cacheService.delete(
          this.getUserDashboardsKey(updatedDashboard.owner_id)
        );

        // Invalidate default dashboards cache if default status changed
        if (updates.is_default !== undefined) {
          await this.cacheService.delete(this.getDefaultDashboardsKey());
        }

        logger.debug('Dashboard updated and cached', { id });
      }

      return updatedDashboard;
    } catch (error) {
      logger.error('Failed to update dashboard', {
        id,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete dashboard with caching
   */
  async deleteDashboard(
    id: string,
    options: PersistenceOptions = {}
  ): Promise<boolean> {
    const { useCache = true } = options;

    try {
      // Get dashboard info before deletion for cache invalidation
      const dashboard = await dashboardModel.findById(id);

      // Delete from database
      await dashboardModel.delete(id);

      if (useCache && dashboard) {
        // Remove from cache
        await this.cacheService.delete(this.getCacheKey(id));

        // Invalidate user dashboards cache
        await this.cacheService.delete(
          this.getUserDashboardsKey(dashboard.owner_id)
        );

        // Invalidate default dashboards cache if this was a default dashboard
        if (dashboard.is_default) {
          await this.cacheService.delete(this.getDefaultDashboardsKey());
        }

        logger.debug('Dashboard deleted and cache invalidated', { id });
      }

      return true;
    } catch (error) {
      logger.error('Failed to delete dashboard', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Bulk invalidate cache for user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      await this.cacheService.delete(this.getUserDashboardsKey(userId));

      // Also invalidate individual dashboard caches for this user
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await this.cacheService.keys(pattern);

      for (const key of keys) {
        const dashboard = await this.cacheService.get<Dashboard>(key);
        if (dashboard?.owner_id === userId) {
          await this.cacheService.delete(key);
        }
      }

      logger.debug('User cache invalidated', { userId });
    } catch (error) {
      logger.error('Failed to invalidate user cache', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Warm cache for frequently accessed dashboards
   */
  async warmCache(dashboardIds: string[]): Promise<void> {
    try {
      const promises = dashboardIds.map(async id => {
        const dashboard = await dashboardModel.findById(id);
        if (dashboard) {
          await this.cacheService.set(
            this.getCacheKey(id),
            dashboard,
            this.DEFAULT_TTL
          );
        }
      });

      await Promise.all(promises);

      logger.info('Cache warmed for dashboards', {
        count: dashboardIds.length,
      });
    } catch (error) {
      logger.error('Failed to warm cache', {
        dashboardIds,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    dashboardKeys: number;
    userListKeys: number;
    defaultsKey: boolean;
  }> {
    try {
      const allKeys = await this.cacheService.keys(`${this.CACHE_PREFIX}*`);
      const dashboardKeys = allKeys.filter(key =>
        key.match(/^dashboard:[^:]+$/)
      ).length;
      const userListKeys = allKeys.filter(key => key.includes(':user:')).length;
      const defaultsKey = await this.cacheService.exists(
        this.getDefaultDashboardsKey()
      );

      return {
        totalKeys: allKeys.length,
        dashboardKeys,
        userListKeys,
        defaultsKey,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        totalKeys: 0,
        dashboardKeys: 0,
        userListKeys: 0,
        defaultsKey: false,
      };
    }
  }

  /**
   * Health check for persistence service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    database: boolean;
    cache: boolean;
    details: Record<string, unknown>;
  }> {
    try {
      // Test database connection
      const dbTest = await dashboardModel.count();
      const databaseHealthy = typeof dbTest === 'number';

      // Test cache connection
      const cacheHealth = await this.cacheService.healthCheck();
      const cacheHealthy = cacheHealth.status === 'healthy';

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!databaseHealthy) {
        status = 'unhealthy';
      } else if (!cacheHealthy) {
        status = 'degraded';
      }

      return {
        status,
        database: databaseHealthy,
        cache: cacheHealthy,
        details: {
          dashboardCount: dbTest,
          cacheHealth: cacheHealth.details,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: false,
        cache: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

// Export singleton instance
export const dashboardPersistenceService = new DashboardPersistenceService();
