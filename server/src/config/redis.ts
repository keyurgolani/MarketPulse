/**
 * Redis Configuration and Connection Management
 * Handles Redis connection with fallback to memory cache
 */

import Redis from 'ioredis';
import { config } from './environment';
import { logger } from '../utils/logger';

export interface RedisManager {
  client: Redis | null;
  isConnected: boolean;
  connect(): Promise<Redis | null>;
  disconnect(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getClient(): Redis | null;
  isHealthy(): boolean;
  getInfo(): Promise<Record<string, unknown>>;
  healthCheck(): Promise<{ status: string; details: Record<string, unknown> }>;
}

class RedisManagerImpl implements RedisManager {
  public client: Redis | null = null;
  public isConnected = false;

  async connect(): Promise<Redis | null> {
    try {
      const redisConfig: Record<string, unknown> = {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      if (config.redis.password) {
        redisConfig.password = config.redis.password;
      }

      this.client = new Redis(redisConfig);

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.client.on('error', error => {
        this.isConnected = false;
        logger.error('Redis connection error:', error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.client = null;
      this.isConnected = false;
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error:', error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected && this.client !== null;
  }

  async getInfo(): Promise<Record<string, unknown>> {
    if (!this.client || !this.isConnected) {
      return {};
    }

    try {
      const info = await this.client.info();
      return { info };
    } catch (error) {
      logger.error('Redis INFO error:', error);
      return {};
    }
  }

  async healthCheck(): Promise<{
    status: string;
    details: Record<string, unknown>;
  }> {
    if (!this.client || !this.isConnected) {
      return {
        status: 'unhealthy',
        details: { error: 'Redis not connected' },
      };
    }

    try {
      await this.client.ping();
      return {
        status: 'healthy',
        details: {
          connected: true,
          host: config.redis.host,
          port: config.redis.port,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

export const redisManager = new RedisManagerImpl();

// Initialize Redis connection
export const initializeRedis = async (): Promise<void> => {
  await redisManager.connect();
};

export default redisManager;
