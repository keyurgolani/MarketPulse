import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import {
  httpLogger,
  requestId,
  responseTime,
  requestLogger,
  errorLogger,
} from './middleware/logging';
import { systemRoutes } from './routes/system';
import { cacheRoutes } from './routes/cache';
import { healthRoutes } from './routes/health';
import { loggingRoutes } from './routes/logging';
import { dashboardRoutes } from './routes/dashboards';
import { assetRoutes } from './routes/assets';
import { newsRoutes } from './routes/news';
import { sharedRoutes } from './routes/shared';
import { cacheService } from './services/CacheService';
import { databaseManager } from './config/database';
import { webSocketService } from './services/WebSocketService';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);
app.use(compression());

// Logging middleware (before body parsing)
app.use(requestId);
app.use(responseTime);
app.use(httpLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (after body parsing)
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// Routes
app.use('/api/system', systemRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/logs', loggingRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/shared', sharedRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorLogger);
app.use(errorHandler);

const PORT = config.port;

// Initialize services and start server
async function startServer(): Promise<void> {
  try {
    // Initialize database
    await databaseManager.connect();
    logger.info('Database initialized successfully');

    // Initialize cache service
    await cacheService.initialize();
    logger.info('Cache service initialized successfully');

    // Initialize WebSocket service
    webSocketService.initialize(httpServer);
    logger.info('WebSocket service initialized successfully');

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`MarketPulse server running on port ${PORT}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info('WebSocket server ready for connections');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  webSocketService.destroy();
  await cacheService.destroy();
  await databaseManager.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  webSocketService.destroy();
  await cacheService.destroy();
  await databaseManager.disconnect();
  process.exit(0);
});

// Only start the server if this file is run directly (not imported)
if (require.main === module) {
  startServer();
}

export default app;
export { startServer };
