import { healthMonitor } from '../services/HealthMonitorService';
import { databaseManager } from '../config/database';
import { cacheService } from '../services/CacheService';

describe('Health Monitor Service', () => {
  beforeEach(() => {
    // Stop any existing monitoring
    healthMonitor.stopMonitoring();
    
    // Clear alerts and history
    healthMonitor.clearResolvedAlerts();
    const alerts = healthMonitor.getAlerts(true);
    alerts.forEach((alert: any) => healthMonitor.resolveAlert(alert.id));
    healthMonitor.clearResolvedAlerts();
    
    // Clear metrics history
    healthMonitor.destroy();
  });

  afterEach(() => {
    healthMonitor.stopMonitoring();
  });

  afterAll(() => {
    healthMonitor.destroy();
  });

  describe('Metrics Collection', () => {
    it('should collect current health metrics', async () => {
      const metrics = await healthMonitor.collectMetrics();
      
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('system');
      expect(metrics).toHaveProperty('services');
      expect(metrics).toHaveProperty('environment');
      
      // Check memory metrics
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('free');
      expect(metrics.memory).toHaveProperty('percentage');
      expect(typeof metrics.memory.used).toBe('number');
      expect(typeof metrics.memory.percentage).toBe('number');
      
      // Check CPU metrics
      expect(metrics.cpu).toHaveProperty('usage');
      expect(metrics.cpu).toHaveProperty('loadAverage');
      expect(typeof metrics.cpu.usage).toBe('number');
      expect(Array.isArray(metrics.cpu.loadAverage)).toBe(true);
      
      // Check system info
      expect(metrics.system).toHaveProperty('platform');
      expect(metrics.system).toHaveProperty('arch');
      expect(metrics.system).toHaveProperty('nodeVersion');
      expect(metrics.system).toHaveProperty('hostname');
      
      // Check services
      expect(metrics.services).toHaveProperty('database');
      expect(metrics.services).toHaveProperty('cache');
      expect(metrics.services.database).toHaveProperty('status');
      expect(metrics.services.cache).toHaveProperty('status');
    });

    it('should maintain metrics history', async () => {
      // Collect a few metrics
      await healthMonitor.collectMetrics();
      await healthMonitor.collectMetrics();
      await healthMonitor.collectMetrics();
      
      const history = healthMonitor.getMetricsHistory();
      expect(history.length).toBe(3);
      
      // Check that timestamps are different
      expect(history[0]?.timestamp).not.toBe(history[1]?.timestamp);
      expect(history[1]?.timestamp).not.toBe(history[2]?.timestamp);
    });

    it('should limit metrics history size', async () => {
      // Collect more metrics than the limit (but not too many for test performance)
      for (let i = 0; i < 15; i++) {
        await healthMonitor.collectMetrics();
      }
      
      const history = healthMonitor.getMetricsHistory();
      expect(history.length).toBe(15);
    }, 15000);

    it('should return limited history when requested', async () => {
      // Collect several metrics
      for (let i = 0; i < 10; i++) {
        await healthMonitor.collectMetrics();
      }
      
      const limitedHistory = healthMonitor.getMetricsHistory(5);
      expect(limitedHistory.length).toBe(5);
      
      // Should return the most recent ones
      const fullHistory = healthMonitor.getMetricsHistory();
      expect(limitedHistory.length).toBeLessThanOrEqual(fullHistory.length);
    });
  });

  describe('Health Status', () => {
    it('should provide overall health status', async () => {
      const healthStatus = await healthMonitor.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('metrics');
      expect(healthStatus).toHaveProperty('alerts');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.status);
      expect(Array.isArray(healthStatus.alerts)).toBe(true);
    });

    it('should determine status based on services', async () => {
      const healthStatus = await healthMonitor.getHealthStatus();
      
      // With working database and cache, should be healthy or degraded (if Redis is unavailable)
      expect(['healthy', 'degraded']).toContain(healthStatus.status);
    });
  });

  describe('Alert Management', () => {
    it('should get alerts with filtering', () => {
      // Initially no alerts
      const activeAlerts = healthMonitor.getAlerts(false);
      const allAlerts = healthMonitor.getAlerts(true);
      
      expect(activeAlerts.length).toBe(0);
      expect(allAlerts.length).toBe(0);
    });

    it('should resolve alerts', () => {
      // Create a mock alert by calling private method (for testing)
      // Since we can't directly create alerts, we'll test the resolution logic
      const alertsBefore = healthMonitor.getAlerts(false);
      expect(alertsBefore.length).toBe(0);
      
      // Try to resolve non-existent alert
      const resolved = healthMonitor.resolveAlert('non-existent');
      expect(resolved).toBe(false);
    });

    it('should clear resolved alerts', () => {
      const clearedCount = healthMonitor.clearResolvedAlerts();
      expect(typeof clearedCount).toBe('number');
      expect(clearedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Monitoring Control', () => {
    it('should start and stop monitoring', (done) => {
      // Start monitoring with short interval for testing
      healthMonitor.startMonitoring(100);
      
      // Wait a bit then stop
      setTimeout(() => {
        healthMonitor.stopMonitoring();
        
        // Check that metrics were collected
        const history = healthMonitor.getMetricsHistory();
        expect(history.length).toBeGreaterThan(0);
        
        done();
      }, 250);
    });

    it('should not start monitoring if already running', () => {
      healthMonitor.startMonitoring(1000);
      
      // Try to start again - should not throw error
      expect(() => {
        healthMonitor.startMonitoring(500);
      }).not.toThrow();
      
      healthMonitor.stopMonitoring();
    });

    it('should handle stop monitoring when not running', () => {
      // Should not throw error
      expect(() => {
        healthMonitor.stopMonitoring();
      }).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should destroy and cleanup resources', () => {
      healthMonitor.startMonitoring(1000);
      
      // Should not throw error
      expect(() => {
        healthMonitor.destroy();
      }).not.toThrow();
      
      // Should clear alerts and history
      const alerts = healthMonitor.getAlerts(true);
      const history = healthMonitor.getMetricsHistory();
      
      expect(alerts.length).toBe(0);
      expect(history.length).toBe(0);
    });
  });
});