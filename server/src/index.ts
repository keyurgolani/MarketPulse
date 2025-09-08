import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import { db } from './config/database';
import { logger } from './utils/logger';
import { SystemHealthService } from './services/SystemHealthService';

// Import middleware
import {
  errorHandler,
  requestLogger,
  requestTiming,
  requestId,
  rateLimiter,
  corsMiddleware,
  preflightHandler,
  corsErrorHandler,
  sanitizeInput,
} from './middleware';

// Import routes
import systemRoutes from './routes/system';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import assetRoutes from './routes/assets';

// Import controller initializers
import { initializeAssetService } from './controllers/assetController';

// Load environment variables
config({ path: '.env' });

// Initialize services after environment variables are loaded
initializeAssetService();

const app = express();
const PORT = process.env.PORT ?? 3001;

// Initialize health service
const healthService = new SystemHealthService(db);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request timing and ID middleware (must be first)
app.use(requestTiming);
app.use(requestId);

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'ws:', 'wss:'],
      },
    },
  })
);

// CORS middleware with preflight handling
app.use(preflightHandler);
app.use(corsMiddleware);
app.use(corsErrorHandler);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Request logging
app.use(requestLogger);

// Rate limiting (applied to all routes)
app.use(rateLimiter);

// Connection tracking middleware
app.use((_req, res, next) => {
  healthService.incrementConnections();

  res.on('finish', () => {
    healthService.decrementConnections();
  });

  res.on('close', () => {
    healthService.decrementConnections();
  });

  next();
});

// API routes
app.use('/api/system', systemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/assets', assetRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'MarketPulse API',
      version: process.env.npm_package_version ?? '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    },
    timestamp: Date.now(),
  });
});

// API root endpoint
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'MarketPulse API',
      version: process.env.npm_package_version ?? '1.0.0',
      endpoints: {
        system: '/api/system',
        health: '/api/system/health',
        info: '/api/system/info',
        auth: '/api/auth',
        dashboards: '/api/dashboards',
        assets: '/api/assets',
      },
    },
    timestamp: Date.now(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('404 - Endpoint not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    timestamp: Date.now(),
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await db.connect();
    logger.info('Database connected successfully');

    // Start server
    const server = app.listen(PORT, () => {
      logger.info('MarketPulse API server started', {
        port: PORT,
        environment: process.env.NODE_ENV ?? 'development',
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      });

      console.log(`🚀 MarketPulse API server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV ?? 'development'}`);
      console.log(
        `🔗 Health check: http://localhost:${PORT}/api/system/health`
      );
      console.log(`📋 API docs: http://localhost:${PORT}/api`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await db.disconnect();
          logger.info('Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Start the server
startServer();
