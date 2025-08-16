import { createClient, RedisClientType } from 'redis';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

export class RedisManager {
  private static instance: RedisManager;
  private client: RedisClientType | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public async connect(): Promise<RedisClientType | null> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      // Create Redis client
      const clientConfig: any = {
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          reconnectStrategy: (retries: number) => {
            if (retries >= this.maxReconnectAttempts) {
              logger.error(`Redis reconnection failed after ${retries} attempts`);
              return false; // Stop reconnecting
            }
            const delay = Math.min(this.reconnectDelay * Math.pow(2, retries), 30000);
            logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries + 1})`);
            return delay;
          },
        },
      };

      // Add password if configured
      if (config.redis.password) {
        clientConfig.password = config.redis.password;
      }

      // Add URL if configured (overrides host/port)
      if (config.redis.url) {
        clientConfig.url = config.redis.url;
        delete clientConfig.socket;
      }

      this.client = createClient(clientConfig);

      // Set up event listeners
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis client connection ended');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.reconnectAttempts++;
        logger.info(`Redis client reconnecting (attempt ${this.reconnectAttempts})`);
      });

      // Connect to Redis
      await this.client.connect();
      
      logger.info(`Redis connected successfully to ${config.redis.host}:${config.redis.port}`);
      return this.client;

    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.client = null;
      this.isConnected = false;
      return null;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.client = null;
        this.isConnected = false;
        logger.info('Redis disconnected successfully');
      } catch (error) {
        logger.error('Error disconnecting from Redis:', error);
        // Force disconnect
        if (this.client) {
          this.client.disconnect();
          this.client = null;
          this.isConnected = false;
        }
      }
    }
  }

  public getClient(): RedisClientType | null {
    return this.client;
  }

  public isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }

  public async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.isConnected || !this.client) {
        return { status: 'disconnected' };
      }

      // Simple ping test
      const pong = await this.client.ping();
      
      if (pong === 'PONG') {
        return { 
          status: 'healthy',
          details: {
            connected: true,
            host: config.redis.host,
            port: config.redis.port,
          }
        };
      } else {
        return { status: 'unhealthy', details: { ping: pong } };
      }
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return { 
        status: 'unhealthy', 
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  public async flushAll(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.flushAll();
        logger.info('Redis cache cleared');
      } catch (error) {
        logger.error('Failed to flush Redis cache:', error);
        throw error;
      }
    }
  }

  public async getInfo(): Promise<string | null> {
    if (this.client && this.isConnected) {
      try {
        return await this.client.info();
      } catch (error) {
        logger.error('Failed to get Redis info:', error);
        return null;
      }
    }
    return null;
  }
}

// Export singleton instance
export const redisManager = RedisManager.getInstance();