// Test setup file
import { logger } from '@/utils/logger';

// Suppress logs during testing
logger.silent = true;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.DATABASE_URL = ':memory:';
process.env.LOG_LEVEL = 'error';