import { Database } from '../config/database';
import { logger } from '../utils/logger';

export interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  error?: string;
  lastCheck: string;
  details?: any;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    memory: ServiceStatus;
    disk: ServiceStatus;
  };
  metrics: {
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    cpuUsage?: number;
    activeConnections: number;
  };
}

export class SystemHealthService {
  private db: Database;
  private startTime: number;
  private activeConnections: number = 0;

  constructor(database: Database) {
    this.db = database;
    this.startTime = Date.now();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Check all services
    const [databaseStatus, memoryStatus, diskStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkMemory(),
      this.checkDisk(),
    ]);

    // Determine overall system status
    const services = { database: databaseStatus, memory: memoryStatus, disk: diskStatus };
    const overallStatus = this.determineOverallStatus(services);

    // Get system metrics
    const metrics = this.getSystemMetrics();

    return {
      status: overallStatus,
      timestamp,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      metrics,
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const result = await this.db.healthCheck();
      
      return {
        status: result.status === 'healthy' ? 'healthy' : 'unhealthy',
        responseTime: result.responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          connected: result.status === 'healthy',
        },
        ...(result.error && { error: result.error }),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      
      logger.error('Database health check failed', { error: errorMessage });
      
      return {
        status: 'unhealthy',
        responseTime,
        error: errorMessage,
        lastCheck: new Date().toISOString(),
        details: {
          connected: false,
        },
      };
    }
  }

  private async checkMemory(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryPercentage = (usedMemory / totalMemory) * 100;
      
      // Consider memory unhealthy if usage is above 90%
      const status = memoryPercentage > 90 ? 'unhealthy' : 
                   memoryPercentage > 75 ? 'degraded' : 'healthy';
      
      return {
        status,
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        details: {
          heapUsed: usedMemory,
          heapTotal: totalMemory,
          percentage: Math.round(memoryPercentage * 100) / 100,
          rss: memUsage.rss,
          external: memUsage.external,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown memory error';
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: errorMessage,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private async checkDisk(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Basic disk check - ensure we can write to temp directory
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');
      
      const tempFile = path.join(os.tmpdir(), `health-check-${Date.now()}.tmp`);
      
      await fs.writeFile(tempFile, 'health check');
      await fs.unlink(tempFile);
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        details: {
          writable: true,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown disk error';
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: errorMessage,
        lastCheck: new Date().toISOString(),
        details: {
          writable: false,
        },
      };
    }
  }

  private determineOverallStatus(services: Record<string, ServiceStatus>): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(services).map(service => service.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private getSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100,
      },
      activeConnections: this.activeConnections,
    };
  }

  // Connection tracking methods
  incrementConnections(): void {
    this.activeConnections++;
  }

  decrementConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  getActiveConnections(): number {
    return this.activeConnections;
  }

  // Quick health check for load balancers
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getSystemHealth();
      return health.status === 'healthy';
    } catch (error) {
      logger.error('Health check failed', { error });
      return false;
    }
  }
}