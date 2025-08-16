import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

// Security configuration interface
interface SecurityConfig {
  cors: {
    origin: string | string[] | boolean;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
  };
  helmet: any; // Use any for helmet config to avoid type issues
  rateLimit: {
    windowMs: number;
    max: number;
    message: string;
  };
}

// Get security configuration based on environment
const getSecurityConfig = (): SecurityConfig => {
  const isDevelopment = config.nodeEnv === 'development' || config.nodeEnv === 'test';
  const isProduction = config.nodeEnv === 'production';

  return {
    cors: {
      origin: isDevelopment 
        ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']
        : config.cors.origin ? [config.cors.origin] : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Request-ID',
        'Cache-Control',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-ID',
        'X-Response-Time',
      ],
      maxAge: 86400, // 24 hours
    },
    helmet: {
      contentSecurityPolicy: isProduction ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'https://api.yahoo.com', 'https://query1.finance.yahoo.com'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      } : false, // Disable CSP in development for easier debugging
      crossOriginEmbedderPolicy: false, // May interfere with some APIs
      crossOriginOpenerPolicy: false, // Disable for compatibility
      crossOriginResourcePolicy: false, // Disable for compatibility  
      dnsPrefetchControl: false,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: isProduction ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      } : false,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    },
  };
};

// Input sanitization middleware
const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Sanitize strings
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .trim();
    }
    
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remove potentially dangerous keys
      if (key.startsWith('__') || key.includes('prototype') || key.includes('constructor') || key.startsWith('on')) {
        continue;
      }

      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters (skip since req.query is read-only in Express)
  // Query sanitization should be handled at the route level if needed

  next();
};

// Request size limiting middleware
const limitRequestSize = (maxSize: string = '10mb') => {
  // Validate the maxSize parameter when creating the middleware
  const maxBytes = parseSize(maxSize);
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      
      if (size > maxBytes) {
        logger.warn('Request size limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          contentLength: size,
          maxSize: maxBytes,
        });
        
        res.status(413).json({
          success: false,
          error: 'Request entity too large',
          message: `Request size ${size} bytes exceeds limit of ${maxBytes} bytes`,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }
    
    next();
  };
};

// Helper function to parse size strings (e.g., "10mb", "1gb")
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]!);
  const unit = match[2] || 'b';
  
  if (!(unit in units)) {
    throw new Error(`Unknown size unit: ${unit}`);
  }
  
  return Math.floor(value * units[unit]!);
};

// Security headers middleware
const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Add cache control for security-sensitive endpoints
  if (req.path.includes('/api/system') || req.path.includes('/api/logs')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// IP whitelist/blacklist middleware
const ipFilter = (options: {
  whitelist?: string[];
  blacklist?: string[];
  trustProxy?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const getClientIP = (): string => {
      if (options.trustProxy) {
        const forwarded = req.headers['x-forwarded-for'] as string;
        if (forwarded) {
          return forwarded.split(',')[0]!.trim();
        }
      }
      return req.ip || req.connection.remoteAddress || 'unknown';
    };
    
    const clientIP = getClientIP();
    
    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(clientIP)) {
      logger.warn('Blocked request from blacklisted IP', {
        ip: clientIP,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP address is not allowed to access this resource',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Check whitelist if configured
    if (options.whitelist && options.whitelist.length > 0) {
      if (!options.whitelist.includes(clientIP)) {
        logger.warn('Blocked request from non-whitelisted IP', {
          ip: clientIP,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
        });
        
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Your IP address is not authorized to access this resource',
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }
    
    next();
  };
};

// API key validation middleware
const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;
  
  // Skip API key validation for health checks and public endpoints
  if (req.path === '/api/system/health' || req.path === '/api/system/info') {
    return next();
  }
  
  if (!apiKey) {
    logger.warn('Missing API key', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    res.status(401).json({
      success: false,
      error: 'Missing API key',
      message: 'API key is required for this endpoint',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  // Validate API key format (basic validation)
  if (!/^[a-zA-Z0-9_-]{32,}$/.test(apiKey)) {
    logger.warn('Invalid API key format', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      apiKeyLength: apiKey.length,
    });
    
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
      message: 'API key format is invalid',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  // TODO: Implement actual API key validation against database
  // For now, accept any properly formatted key
  
  next();
};

// Request timeout middleware
const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          timeout: timeoutMs,
        });
        
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          message: `Request timed out after ${timeoutMs}ms`,
          timestamp: new Date().toISOString(),
        });
      }
    }, timeoutMs);
    
    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    res.on('close', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
};

// Main security middleware setup function (without sanitization)
export const setupSecurity = () => {
  const securityConfig = getSecurityConfig();
  
  return [
    // Request timeout (should be first)
    requestTimeout(30000),
    
    // Helmet for security headers
    helmet(securityConfig.helmet),
    
    // CORS configuration
    cors(securityConfig.cors),
    
    // Custom security headers
    securityHeaders,
    
    // Request size limiting
    limitRequestSize('10mb'),
  ];
};

// Security middleware setup with sanitization (for after body parsing)
export const setupSecurityWithSanitization = () => {
  const securityConfig = getSecurityConfig();
  
  return [
    // Request timeout (should be first)
    requestTimeout(30000),
    
    // Helmet for security headers
    helmet(securityConfig.helmet),
    
    // CORS configuration
    cors(securityConfig.cors),
    
    // Custom security headers
    securityHeaders,
    
    // Request size limiting
    limitRequestSize('10mb'),
    
    // Input sanitization (after body parsing)
    sanitizeInput,
  ];
};

// Export individual middleware functions
export {
  getSecurityConfig,
  limitRequestSize,
  securityHeaders,
  ipFilter,
  validateApiKey,
  requestTimeout,
  sanitizeInput,
};

// Export default security setup
export default setupSecurity;