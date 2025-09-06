import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT ?? 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

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

// CORS configuration
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/system/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
    },
    timestamp: Date.now(),
  });
});

// System info endpoint
app.get('/api/system/info', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'MarketPulse API',
      version: '1.0.0',
      description: 'Financial dashboard platform backend API',
      environment: process.env.NODE_ENV ?? 'development',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    timestamp: Date.now(),
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: Date.now(),
  });
});

// Global error handler
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ): void => {
    console.error('Unhandled error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now(),
    });
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MarketPulse API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`🌐 CORS origin: ${CORS_ORIGIN}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/system/health`);
});
