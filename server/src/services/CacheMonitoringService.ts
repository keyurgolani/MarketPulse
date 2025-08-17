/**
 * Cache Monitoring Service
 * Performance metrics collection, alerting, and dashboard data
 */

import {
  cacheConfig,
  getAlertThresholds,
  isMonitoringEnabled,
} from '../config/cache';
import { CacheService } from './CacheService';
import { EnhancedCacheService } from './EnhancedCacheService';
import { logger } from '../utils/logger';

export interface CachePerformanceMetrics {
  timestamp: number;
  hitRate: number;
  missRate: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  redisConnections: number;
  warmingTasks: number;
  backgroundRefreshes: number;
  rateLimitEvents: number;
  adaptiveTTLAdjustments: number;
}

export interface CacheAlert {
  id: string;
  type: 'hit_rate' | 'response_time' | 'error_rate' | 'memory_usage';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface CacheDashboardData {
  currentMetrics: CachePerformanceMetrics;
  historicalMetrics: CachePerformanceMetrics[];
  activeAlerts: CacheAlert[];
  topKeys: Array<{
    key: string;
    hitCount: number;
    missCount: number;
    hitRate: number;
    lastAccess: number;
    size: number;
  }>;
  cacheDistribution: Array<{
    dataType: string;
    keyCount: number;
    totalSize: number;
    avgTTL: number;
  }>;
}

export class CacheMonitoringService {
  private cacheService: CacheService;
  private enhancedCacheService: EnhancedCacheService;
  private metricsHistory: CachePerformanceMetrics[] = [];
  private activeAlerts: Map<string, CacheAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private keyStats: Map<
    string,
    {
      hits: number;
      misses: number;
      lastAccess: number;
      size: number;
    }
  > = new Map();

  constructor(
    cacheService: CacheService,
    enhancedCacheService: EnhancedCacheService
  ) {
    this.cacheService = cacheService;
    this.enhancedCacheService = enhancedCacheService;

    if (isMonitoringEnabled()) {
      this.startMonitoring();
    }
  }

  /**
   * Start monitoring process
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
        this.cleanupOldMetrics();
      } catch (error) {
        logger.error('Cache monitoring failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 60000); // Collect metrics every minute

    logger.info('Cache monitoring started');
  }

  /**
   * Collect performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const cacheStats = await this.cacheService.getStats();
      const enhancedMetrics = this.enhancedCacheService.getMetrics();
      await this.enhancedCacheService.getHealth();

      const metrics: CachePerformanceMetrics = {
        timestamp: Date.now(),
        hitRate: enhancedMetrics.hitRate,
        missRate: enhancedMetrics.missRate,
        responseTime: enhancedMetrics.responseTime,
        errorRate: enhancedMetrics.errorRate,
        throughput: this.calculateThroughput(),
        memoryUsage: this.getMemoryUsage(cacheStats),
        redisConnections: cacheStats.redis.available ? 1 : 0,
        warmingTasks: enhancedMetrics.warmingTasks,
        backgroundRefreshes: enhancedMetrics.backgroundRefreshes,
        rateLimitEvents: enhancedMetrics.rateLimitEvents,
        adaptiveTTLAdjustments: enhancedMetrics.adaptiveTTLAdjustments,
      };

      this.metricsHistory.push(metrics);

      logger.debug('Cache metrics collected', {
        hitRate: metrics.hitRate,
        responseTime: metrics.responseTime,
        errorRate: metrics.errorRate,
      });
    } catch (error) {
      logger.error('Failed to collect cache metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(): Promise<void> {
    if (this.metricsHistory.length === 0) {
      return;
    }

    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latestMetrics) {
      return;
    }

    const thresholds = getAlertThresholds();

    // Check hit rate alert
    this.checkAlert(
      'hit_rate_low',
      'hit_rate',
      latestMetrics.hitRate < thresholds.hitRateBelow,
      `Cache hit rate is below threshold: ${latestMetrics.hitRate.toFixed(1)}% < ${thresholds.hitRateBelow}%`,
      latestMetrics.hitRate < thresholds.hitRateBelow * 0.5
        ? 'critical'
        : 'warning'
    );

    // Check response time alert
    this.checkAlert(
      'response_time_high',
      'response_time',
      latestMetrics.responseTime > thresholds.responseTimeAbove,
      `Cache response time is above threshold: ${latestMetrics.responseTime.toFixed(0)}ms > ${thresholds.responseTimeAbove}ms`,
      latestMetrics.responseTime > thresholds.responseTimeAbove * 2
        ? 'critical'
        : 'warning'
    );

    // Check error rate alert
    this.checkAlert(
      'error_rate_high',
      'error_rate',
      latestMetrics.errorRate > thresholds.errorRateAbove,
      `Cache error rate is above threshold: ${latestMetrics.errorRate.toFixed(1)}% > ${thresholds.errorRateAbove}%`,
      latestMetrics.errorRate > thresholds.errorRateAbove * 2
        ? 'critical'
        : 'warning'
    );

    // Check memory usage alert
    const memoryThreshold = 80; // 80% of max memory
    this.checkAlert(
      'memory_usage_high',
      'memory_usage',
      latestMetrics.memoryUsage > memoryThreshold,
      `Cache memory usage is high: ${latestMetrics.memoryUsage.toFixed(1)}% > ${memoryThreshold}%`,
      latestMetrics.memoryUsage > 90 ? 'critical' : 'warning'
    );
  }

  /**
   * Check individual alert condition
   */
  private checkAlert(
    alertId: string,
    type: CacheAlert['type'],
    condition: boolean,
    message: string,
    severity: CacheAlert['severity']
  ): void {
    const existingAlert = this.activeAlerts.get(alertId);

    if (condition) {
      if (!existingAlert) {
        // Create new alert
        const alert: CacheAlert = {
          id: alertId,
          type,
          severity,
          message,
          timestamp: Date.now(),
          resolved: false,
        };

        this.activeAlerts.set(alertId, alert);
        logger.warn('Cache alert triggered', alert);
      }
    } else if (existingAlert && !existingAlert.resolved) {
      // Resolve existing alert
      existingAlert.resolved = true;
      existingAlert.resolvedAt = Date.now();
      logger.info('Cache alert resolved', {
        alertId,
        resolvedAt: existingAlert.resolvedAt,
      });
    }
  }

  /**
   * Calculate throughput (requests per minute)
   */
  private calculateThroughput(): number {
    if (this.metricsHistory.length < 2) {
      return 0;
    }

    const current = this.metricsHistory[this.metricsHistory.length - 1];
    const previous = this.metricsHistory[this.metricsHistory.length - 2];

    if (!current || !previous) {
      return 0;
    }

    const timeDiff = (current.timestamp - previous.timestamp) / 1000 / 60; // minutes

    // This is a simplified calculation - in a real implementation,
    // you'd track actual request counts
    return (current.hitRate + current.missRate) / timeDiff;
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(cacheStats: unknown): number {
    if (
      cacheStats &&
      typeof cacheStats === 'object' &&
      'memory' in cacheStats &&
      cacheStats.memory &&
      typeof cacheStats.memory === 'object' &&
      'stats' in cacheStats.memory &&
      cacheStats.memory.stats &&
      typeof cacheStats.memory.stats === 'object' &&
      'size' in cacheStats.memory.stats &&
      typeof cacheStats.memory.stats.size === 'number' &&
      cacheConfig.memory.maxSize
    ) {
      return (cacheStats.memory.stats.size / cacheConfig.memory.maxSize) * 100;
    }
    return 0;
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const retentionMs =
      cacheConfig.monitoring.metricsRetention * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionMs;

    this.metricsHistory = this.metricsHistory.filter(
      metric => metric.timestamp > cutoffTime
    );

    // Clean up resolved alerts older than 24 hours
    const alertCutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (
        alert.resolved &&
        alert.resolvedAt &&
        alert.resolvedAt < alertCutoffTime
      ) {
        this.activeAlerts.delete(alertId);
      }
    }
  }

  /**
   * Record key access for statistics
   */
  recordKeyAccess(key: string, hit: boolean, size: number = 0): void {
    const stats = this.keyStats.get(key) || {
      hits: 0,
      misses: 0,
      lastAccess: 0,
      size: 0,
    };

    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }

    stats.lastAccess = Date.now();
    stats.size = size;

    this.keyStats.set(key, stats);
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<CacheDashboardData> {
    const currentMetrics =
      this.metricsHistory.length > 0
        ? this.metricsHistory[this.metricsHistory.length - 1] ||
          this.getEmptyMetrics()
        : this.getEmptyMetrics();

    const topKeys = Array.from(this.keyStats.entries())
      .map(([key, stats]) => ({
        key,
        hitCount: stats.hits,
        missCount: stats.misses,
        hitRate:
          stats.hits + stats.misses > 0
            ? (stats.hits / (stats.hits + stats.misses)) * 100
            : 0,
        lastAccess: stats.lastAccess,
        size: stats.size,
      }))
      .sort((a, b) => b.hitCount + b.missCount - (a.hitCount + a.missCount))
      .slice(0, 10);

    // Get cache distribution by data type
    const cacheDistribution = await this.getCacheDistribution();

    return {
      currentMetrics,
      historicalMetrics: this.metricsHistory.slice(-100), // Last 100 data points
      activeAlerts: Array.from(this.activeAlerts.values()).filter(
        alert => !alert.resolved
      ),
      topKeys,
      cacheDistribution,
    };
  }

  /**
   * Get cache distribution by data type
   */
  private async getCacheDistribution(): Promise<
    CacheDashboardData['cacheDistribution']
  > {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd analyze actual cache keys and their metadata
      const distribution = [
        {
          dataType: 'assets',
          keyCount: 0,
          totalSize: 0,
          avgTTL: cacheConfig.defaultTTL.assets,
        },
        {
          dataType: 'news',
          keyCount: 0,
          totalSize: 0,
          avgTTL: cacheConfig.defaultTTL.news,
        },
        {
          dataType: 'historical',
          keyCount: 0,
          totalSize: 0,
          avgTTL: cacheConfig.defaultTTL.historical,
        },
        {
          dataType: 'search',
          keyCount: 0,
          totalSize: 0,
          avgTTL: cacheConfig.defaultTTL.search,
        },
        {
          dataType: 'metadata',
          keyCount: 0,
          totalSize: 0,
          avgTTL: cacheConfig.defaultTTL.metadata,
        },
      ];

      // Count keys by pattern
      for (const item of distribution) {
        try {
          const keys = await this.cacheService.keys(`*${item.dataType}*`);
          item.keyCount = keys.length;
          // Size calculation would require getting each key's data
          // This is simplified for performance
        } catch (error) {
          logger.warn('Failed to get cache distribution for data type', {
            dataType: item.dataType,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return distribution;
    } catch (error) {
      logger.error('Failed to get cache distribution', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get empty metrics template
   */
  private getEmptyMetrics(): CachePerformanceMetrics {
    return {
      timestamp: Date.now(),
      hitRate: 0,
      missRate: 0,
      responseTime: 0,
      errorRate: 0,
      throughput: 0,
      memoryUsage: 0,
      redisConnections: 0,
      warmingTasks: 0,
      backgroundRefreshes: 0,
      rateLimitEvents: 0,
      adaptiveTTLAdjustments: 0,
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    avgHitRate: number;
    avgResponseTime: number;
    avgErrorRate: number;
    totalAlerts: number;
    activeAlerts: number;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        avgHitRate: 0,
        avgResponseTime: 0,
        avgErrorRate: 0,
        totalAlerts: this.activeAlerts.size,
        activeAlerts: Array.from(this.activeAlerts.values()).filter(
          a => !a.resolved
        ).length,
      };
    }

    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 data points

    return {
      avgHitRate:
        recentMetrics.reduce((sum, m) => sum + m.hitRate, 0) /
        recentMetrics.length,
      avgResponseTime:
        recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
        recentMetrics.length,
      avgErrorRate:
        recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) /
        recentMetrics.length,
      totalAlerts: this.activeAlerts.size,
      activeAlerts: Array.from(this.activeAlerts.values()).filter(
        a => !a.resolved
      ).length,
    };
  }

  /**
   * Stop monitoring
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.metricsHistory = [];
    this.activeAlerts.clear();
    this.keyStats.clear();

    logger.info('Cache monitoring service destroyed');
  }
}

// Export for use in other services
