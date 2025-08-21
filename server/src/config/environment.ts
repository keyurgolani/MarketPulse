/**
 * Environment Configuration
 * Centralized configuration management for the MarketPulse server
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from appropriate .env file
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, '../../', envFile) });

export interface Config {
  // Server Configuration
  port: number;
  nodeEnv: string;

  // Database Configuration
  database: {
    url: string;
    type: 'sqlite' | 'postgres';
    logging: boolean;
  };

  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string | undefined;
    db: number;
  };

  // API Keys
  apiKeys: {
    yahooFinance?: string | undefined;
    googleFinance?: string | undefined;
    newsApi?: string | undefined;
  };

  // Security
  security: {
    jwtSecret: string;
    corsOrigins: string[];
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };

  // CORS Configuration
  cors: {
    origin: string | string[];
  };

  // Logging
  logging: {
    level: string;
    format: string;
  };

  // Test Configuration
  test: {
    useMockData: boolean;
    disableExternalApis: boolean;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'sqlite:./data/marketpulse.db',
    type: (process.env.DATABASE_TYPE as 'sqlite' | 'postgres') || 'sqlite',
    logging: process.env.DATABASE_LOGGING === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  apiKeys: {
    yahooFinance: process.env.YAHOO_FINANCE_API_KEY,
    googleFinance: process.env.GOOGLE_FINANCE_API_KEY,
    newsApi: process.env.NEWS_API_KEY,
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:5173',
    ],
    rateLimitWindowMs: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || '900000',
      10
    ), // 15 minutes
    rateLimitMaxRequests: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || '100',
      10
    ),
  },

  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  test: {
    useMockData: process.env.USE_MOCK_DATA === 'true',
    disableExternalApis: process.env.DISABLE_EXTERNAL_APIS === 'true',
  },
};

export default config;
