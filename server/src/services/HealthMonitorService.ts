import { logger } from '@/utils/logger';
import { databaseManager } from '@/config/database';
import { cacheService } from './CacheService';
import { config } from '@/config/environment';
import os from 'os';
import process from 'process';

export interface HealthMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    free: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    hostname: string;
  };
  services: {
    database: {
      status: string;
      details?: any;
    };
    cache: {
      status: string;
      details?: any;
    };
  };
  environment: {
    nodeEnv: string;
    port: number;
    version: string;
  };
}

export interface HealthAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export class HealthMonitorService {
  private static instance: HealthMonitorService;
  private alerts: Map<string, HealthAlert> = new Map();
  private metricsHistory: HealthMetrics[] = [];
  private maxHistorySize = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  // Thresholds
  private readonly thresholds = {
    memory: {
      warning: 80, // 80% memory usage
      critical: 95, // 95% memory usage
    },
    cpu: {
      warning: 80, // 80% CPU usage
      critical: 95, // 95% CPU usage
    },
    uptime: {
      minimum: 60, // Minimum uptime in seconds before monitoring
    },
  };

  private constructor() {}

  public static getInstance(): HealthMonitorService {
    if (!HealthMonitorService.instance) {
      HealthMonitorService.instance = new HealthMonitorService();
    }
    return HealthMonitorService.instance;
  }

  /**
   * Start health monitoring
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      logger.warn('Health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    logger.info(`Starting health monitoring with ${intervalMs}ms interval`);

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkThresholds();
      } catch (error) {
        logger.error('Error during health monitoring:', error);
      }
    }, intervalMs);

    // Initial metrics collection
    this.collectMetrics().catch(error => {
      logger.error('Error collecting initial metrics:', error);
    });
  }

  /**
   * Stop health monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      logger.info('Health monitoring stopped');
    }
  }

  /**
   * Collect current health metrics
   */
  public async collectMetrics(): Promise<HealthMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Get service health
    const dbHealth = await databaseManager.healthCheck();
    const cacheHealth = await cacheService.healthCheck();

    const metrics: HealthMetrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
        total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
        free: Math.round((freeMemory / 1024 / 1024) * 100) / 100, // MB
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
      cpu: {
        usage: await this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname(),
      },
      services: {
        database: {
          status: dbHealth.status,
          details: dbHealth.details,
        },
        cache: {
          status: cacheHealth.status,
          details: cacheHealth.details,
        },
      },
      environment: {
        nodeEnv: config.nodeEnv,
        port: config.port,
        version: process.env.npm_package_version || '1.0.0',
      },
    };

    // Add to history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Get current health status
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: HealthMetrics;
    alerts: HealthAlert[];
  }> {
    const metrics = await this.collectMetrics();
    const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Determine overall status based on services and alerts
    if (metrics.services.database.status === 'unhealthy' || 
        metrics.services.cache.status === 'unhealthy' ||
        activeAlerts.some(alert => alert.type === 'critical')) {
      status = 'unhealthy';
    } else if (metrics.services.database.status === 'degraded' || 
               metrics.services.cache.status === 'degraded' ||
               activeAlerts.some(alert => alert.type === 'error') ||
               activeAlerts.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      metrics,
      alerts: activeAlerts,
    };
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit?: number): HealthMetrics[] {
    const history = [...this.metricsHistory];
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Get all alerts
   */
  public getAlerts(includeResolved: boolean = false): HealthAlert[] {
    const alerts = Array.from(this.alerts.values());
    if (includeResolved) {
      return alerts;
    }
    return alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      logger.info(`Alert resolved: ${alert.message}`, { alertId, service: alert.service });
      return true;
    }
    return false;
  }

  /**
   * Clear all resolved alerts
   */
  public clearResolvedAlerts(): number {
    const resolvedAlerts = Array.from(this.alerts.entries())
      .filter(([_, alert]) => alert.resolved);
    
    resolvedAlerts.forEach(([id]) => this.alerts.delete(id));
    
    logger.info(`Cleared ${resolvedAlerts.length} resolved alerts`);
    return resolvedAlerts.length;
  }

  /**
   * Check thresholds and create alerts
   */
  private async checkThresholds(): Promise<void> {
    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    if (!latest) return;

    // Skip threshold checks if system just started
    if (latest.uptime < this.thresholds.uptime.minimum) {
      return;
    }

    // Check memory usage
    this.checkMemoryThreshold(latest);

    // Check CPU usage
    this.checkCpuThreshold(latest);

    // Check service health
    this.checkServiceHealth(latest);
  }

  /**
   * Check memory usage thresholds
   */
  private checkMemoryThreshold(metrics: HealthMetrics): void {
    const memoryPercentage = metrics.memory.percentage;
    const alertId = 'memory-usage';

    if (memoryPercentage >= this.thresholds.memory.critical) {
      this.createOrUpdateAlert(alertId, {
        type: 'critical',
        service: 'system',
        message: `Critical memory usage: ${memoryPercentage}%`,
      });
    } else if (memoryPercentage >= this.thresholds.memory.warning) {
      this.createOrUpdateAlert(alertId, {
        type: 'warning',
        service: 'system',
        message: `High memory usage: ${memoryPercentage}%`,
      });
    } else {
      // Memory usage is normal, resolve any existing alerts
      this.resolveAlert(alertId);
    }
  }

  /**
   * Check CPU usage thresholds
   */
  private checkCpuThreshold(metrics: HealthMetrics): void {
    const cpuUsage = metrics.cpu.usage;
    const alertId = 'cpu-usage';

    if (cpuUsage >= this.thresholds.cpu.critical) {
      this.createOrUpdateAlert(alertId, {
        type: 'critical',
        service: 'system',
        message: `Critical CPU usage: ${cpuUsage.toFixed(1)}%`,
      });
    } else if (cpuUsage >= this.thresholds.cpu.warning) {
      this.createOrUpdateAlert(alertId, {
        type: 'warning',
        service: 'system',
        message: `High CPU usage: ${cpuUsage.toFixed(1)}%`,
      });
    } else {
      // CPU usage is normal, resolve any existing alerts
      this.resolveAlert(alertId);
    }
  }

  /**
   * Check service health
   */
  private checkServiceHealth(metrics: HealthMetrics): void {
    // Check database health
    const dbStatus = metrics.services.database.status;
    const dbAlertId = 'database-health';

    if (dbStatus === 'unhealthy') {
      this.createOrUpdateAlert(dbAlertId, {
        type: 'critical',
        service: 'database',
        message: 'Database is unhealthy',
      });
    } else if (dbStatus === 'degraded') {
      this.createOrUpdateAlert(dbAlertId, {
        type: 'warning',
        service: 'database',
        message: 'Database is degraded',
      });
    } else {
      this.resolveAlert(dbAlertId);
    }

    // Check cache health
    const cacheStatus = metrics.services.cache.status;
    const cacheAlertId = 'cache-health';

    if (cacheStatus === 'unhealthy') {
      this.createOrUpdateAlert(cacheAlertId, {
        type: 'error',
        service: 'cache',
        message: 'Cache service is unhealthy',
      });
    } else if (cacheStatus === 'degraded') {
      this.createOrUpdateAlert(cacheAlertId, {
        type: 'warning',
        service: 'cache',
        message: 'Cache service is degraded (fallback mode)',
      });
    } else {
      this.resolveAlert(cacheAlertId);
    }
  }

  /**
   * Create or update an alert
   */
  private createOrUpdateAlert(id: string, alertData: {
    type: 'warning' | 'error' | 'critical';
    service: string;
    message: string;
  }): void {
    const existingAlert = this.alerts.get(id);
    
    if (existingAlert && !existingAlert.resolved) {
      // Update existing alert if severity changed
      if (existingAlert.type !== alertData.type || existingAlert.message !== alertData.message) {
        existingAlert.type = alertData.type;
        existingAlert.message = alertData.message;
        existingAlert.timestamp = new Date().toISOString();
        logger.warn(`Alert updated: ${alertData.message}`, { 
          alertId: id, 
          service: alertData.service,
          type: alertData.type 
        });
      }
    } else {
      // Create new alert
      const alert: HealthAlert = {
        id,
        type: alertData.type,
        service: alertData.service,
        message: alertData.message,
        timestamp: new Date().toISOString(),
        resolved: false,
      };
      
      this.alerts.set(id, alert);
      
      const logLevel = alertData.type === 'critical' ? 'error' : 
                      alertData.type === 'error' ? 'error' : 'warn';
      
      logger[logLevel](`New alert: ${alertData.message}`, { 
        alertId: id, 
        service: alertData.service,
        type: alertData.type 
      });
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const currentTime = process.hrtime(startTime);
        
        const totalTime = currentTime[0] * 1000000 + currentTime[1] / 1000; // microseconds
        const totalCpuTime = currentUsage.user + currentUsage.system; // microseconds
        
        const cpuPercent = (totalCpuTime / totalTime) * 100;
        resolve(Math.min(100, Math.max(0, cpuPercent)));
      }, 100);
    });
  }

  /**
   * Destroy the health monitor and cleanup resources
   */
  public destroy(): void {
    this.stopMonitoring();
    this.alerts.clear();
    this.metricsHistory.length = 0;
    logger.info('Health monitor destroyed');
  }
}

// Export singleton instance
export const healthMonitor = HealthMonitorService.getInstance();