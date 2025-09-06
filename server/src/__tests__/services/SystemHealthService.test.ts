import { SystemHealthService } from '../../services/SystemHealthService';
import { Database } from '../../config/database';

// Mock the database
const mockDatabase = {
  healthCheck: jest.fn(),
} as unknown as Database;

// Mock fs/promises for disk check
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

// Mock os for temp directory
jest.mock('os', () => ({
  tmpdir: jest.fn().mockReturnValue('/tmp'),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
}));

describe('SystemHealthService', () => {
  let healthService: SystemHealthService;
  let mockWriteFile: jest.Mock;
  let mockUnlink: jest.Mock;

  beforeEach(() => {
    healthService = new SystemHealthService(mockDatabase);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Get mocked functions
    const fs = require('fs/promises');
    mockWriteFile = fs.writeFile;
    mockUnlink = fs.unlink;
  });

  describe('getSystemHealth', () => {
    it('should return healthy status when all services are healthy', async () => {
      // Mock successful database health check
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      
      // Mock successful disk operations
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      const health = await healthService.getSystemHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.services.database.status).toBe('healthy');
      expect(health.services.memory.status).toBe('healthy');
      expect(health.services.disk.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.version).toBeDefined();
      expect(health.environment).toBeDefined();
      expect(health.metrics).toBeDefined();
    });

    it('should return unhealthy status when database is unhealthy', async () => {
      // Mock failed database health check
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        responseTime: 5000,
        error: 'Connection failed',
      });
      
      // Mock successful disk operations
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      const health = await healthService.getSystemHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.services.database.status).toBe('unhealthy');
      expect(health.services.database.error).toBe('Connection failed');
    });

    it('should return degraded status when memory usage is high', async () => {
      // Mock successful database health check
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      
      // Mock successful disk operations
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 800 * 1024 * 1024, // 800MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (80% usage)
        rss: 900 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      }) as any;
      
      const health = await healthService.getSystemHealth();
      
      expect(health.status).toBe('degraded');
      expect(health.services.memory.status).toBe('degraded');
      
      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should return unhealthy status when disk operations fail', async () => {
      // Mock successful database health check
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      
      // Mock failed disk operations
      mockWriteFile.mockRejectedValue(new Error('Disk full'));
      
      const health = await healthService.getSystemHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.services.disk.status).toBe('unhealthy');
      expect(health.services.disk.error).toBe('Disk full');
    });
  });

  describe('checkDatabase', () => {
    it('should return healthy status for successful database check', async () => {
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 15,
      });
      
      const health = await healthService.getSystemHealth();
      
      expect(health.services.database.status).toBe('healthy');
      expect(health.services.database.responseTime).toBe(15);
      expect(health.services.database.details.connected).toBe(true);
    });

    it('should return unhealthy status for failed database check', async () => {
      (mockDatabase.healthCheck as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      const health = await healthService.getSystemHealth();
      
      expect(health.services.database.status).toBe('unhealthy');
      expect(health.services.database.error).toBe('Database error');
      expect(health.services.database.details.connected).toBe(false);
    });
  });

  describe('checkMemory', () => {
    it('should return healthy status for normal memory usage', async () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 500 * 1024 * 1024, // 500MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (50% usage)
        rss: 600 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      }) as any;
      
      // Mock other services as healthy
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      const health = await healthService.getSystemHealth();
      
      expect(health.services.memory.status).toBe('healthy');
      expect(health.services.memory.details.percentage).toBe(50);
      
      process.memoryUsage = originalMemoryUsage;
    });

    it('should return degraded status for high memory usage', async () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 800 * 1024 * 1024, // 800MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (80% usage)
        rss: 900 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      }) as any;
      
      // Mock other services as healthy
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      const health = await healthService.getSystemHealth();
      
      expect(health.services.memory.status).toBe('degraded');
      
      process.memoryUsage = originalMemoryUsage;
    });

    it('should return unhealthy status for very high memory usage', async () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 950 * 1024 * 1024, // 950MB
        heapTotal: 1000 * 1024 * 1024, // 1GB (95% usage)
        rss: 980 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      }) as any;
      
      // Mock other services as healthy
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      const health = await healthService.getSystemHealth();
      
      expect(health.services.memory.status).toBe('unhealthy');
      
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('checkDisk', () => {
    it('should return healthy status for successful disk operations', async () => {
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      // Mock other services as healthy
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      
      const health = await healthService.getSystemHealth();
      
      expect(health.services.disk.status).toBe('healthy');
      expect(health.services.disk.details.writable).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should return unhealthy status for failed disk operations', async () => {
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));
      
      // Mock other services as healthy
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      
      const health = await healthService.getSystemHealth();
      
      expect(health.services.disk.status).toBe('unhealthy');
      expect(health.services.disk.error).toBe('Permission denied');
      expect(health.services.disk.details.writable).toBe(false);
    });
  });

  describe('connection tracking', () => {
    it('should track active connections correctly', () => {
      expect(healthService.getActiveConnections()).toBe(0);
      
      healthService.incrementConnections();
      expect(healthService.getActiveConnections()).toBe(1);
      
      healthService.incrementConnections();
      expect(healthService.getActiveConnections()).toBe(2);
      
      healthService.decrementConnections();
      expect(healthService.getActiveConnections()).toBe(1);
      
      healthService.decrementConnections();
      expect(healthService.getActiveConnections()).toBe(0);
    });

    it('should not go below zero connections', () => {
      expect(healthService.getActiveConnections()).toBe(0);
      
      healthService.decrementConnections();
      expect(healthService.getActiveConnections()).toBe(0);
    });
  });

  describe('isHealthy', () => {
    it('should return true when system is healthy', async () => {
      // Mock all services as healthy
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        responseTime: 10,
      });
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      const isHealthy = await healthService.isHealthy();
      
      expect(isHealthy).toBe(true);
    });

    it('should return false when system is unhealthy', async () => {
      // Mock database as unhealthy
      (mockDatabase.healthCheck as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        responseTime: 5000,
        error: 'Connection failed',
      });
      mockWriteFile.mockResolvedValue(undefined);
      mockUnlink.mockResolvedValue(undefined);
      
      const isHealthy = await healthService.isHealthy();
      
      expect(isHealthy).toBe(false);
    });

    it('should return false when health check throws error', async () => {
      (mockDatabase.healthCheck as jest.Mock).mockRejectedValue(new Error('Health check failed'));
      
      const isHealthy = await healthService.isHealthy();
      
      expect(isHealthy).toBe(false);
    });
  });
});