/**
 * OpenAPI/Swagger documentation generator for MarketPulse API
 * Provides interactive API documentation and testing interface
 */

import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

/**
 * OpenAPI specification configuration
 */
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MarketPulse API',
      version: '1.0.0',
      description: `
        MarketPulse is a comprehensive financial dashboard platform that provides real-time market data,
        news aggregation, and customizable dashboards for traders and investors.
        
        ## Features
        - Real-time market data from multiple sources
        - Customizable dashboards and widgets
        - News aggregation with sentiment analysis
        - User preferences and accessibility settings
        - WebSocket support for live updates
        - Comprehensive caching and rate limiting
        
        ## Authentication
        This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API requests are rate limited to prevent abuse. Current limits:
        - 100 requests per 15 minutes for authenticated users
        - 20 requests per 15 minutes for unauthenticated users
        
        ## Error Handling
        All endpoints return standardized error responses with appropriate HTTP status codes.
        Validation errors include detailed field-level error information.
      `,
      contact: {
        name: 'MarketPulse API Support',
        email: 'support@marketpulse.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.marketpulse.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication',
        },
      },
      schemas: {
        // Common response schemas
        ApiResponse: {
          type: 'object',
          properties: {
            data: {
              description: 'Response data payload',
            },
            success: {
              type: 'boolean',
              description: 'Indicates if the request was successful',
            },
            error: {
              type: 'string',
              description: 'Error message if success is false',
            },
            timestamp: {
              type: 'number',
              description: 'Unix timestamp when response was generated',
            },
            meta: {
              $ref: '#/components/schemas/ResponseMetadata',
            },
          },
          required: ['data', 'success', 'timestamp'],
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {},
              description: 'Array of data items',
            },
            pagination: {
              $ref: '#/components/schemas/PaginationInfo',
            },
            success: {
              type: 'boolean',
            },
            timestamp: {
              type: 'number',
            },
          },
          required: ['data', 'pagination', 'success', 'timestamp'],
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Current page number (1-based)',
            },
            limit: {
              type: 'number',
              description: 'Number of items per page',
            },
            total: {
              type: 'number',
              description: 'Total number of items',
            },
            totalPages: {
              type: 'number',
              description: 'Total number of pages',
            },
            hasNext: {
              type: 'boolean',
              description: 'Whether there is a next page',
            },
            hasPrev: {
              type: 'boolean',
              description: 'Whether there is a previous page',
            },
          },
          required: [
            'page',
            'limit',
            'total',
            'totalPages',
            'hasNext',
            'hasPrev',
          ],
        },
        ResponseMetadata: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              enum: ['cache', 'database', 'external-api'],
              description: 'Source of the data',
            },
            processingTime: {
              type: 'number',
              description: 'Processing time in milliseconds',
            },
            cacheTtl: {
              type: 'number',
              description: 'Cache TTL in seconds',
            },
            version: {
              type: 'string',
              description: 'API version',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type or code',
            },
            message: {
              type: 'string',
              description: 'Human-readable error message',
            },
            statusCode: {
              type: 'number',
              description: 'HTTP status code',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
            path: {
              type: 'string',
              description: 'Request path that caused the error',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
            validationErrors: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ValidationError',
              },
            },
          },
          required: ['error', 'message', 'statusCode', 'timestamp'],
        },
        ValidationError: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              description: 'Field name that failed validation',
            },
            message: {
              type: 'string',
              description: 'Error message for the field',
            },
            value: {
              description: 'The invalid value that was provided',
            },
            rule: {
              type: 'string',
              description: 'Validation rule that was violated',
            },
          },
          required: ['field', 'message'],
        },
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            displayName: {
              type: 'string',
              description: 'User display name',
            },
            preferences: {
              $ref: '#/components/schemas/UserPreferences',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
            },
            isActive: {
              type: 'boolean',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'moderator'],
            },
          },
          required: [
            'id',
            'email',
            'preferences',
            'createdAt',
            'updatedAt',
            'isActive',
            'role',
          ],
        },
        UserPreferences: {
          type: 'object',
          properties: {
            theme: {
              type: 'string',
              enum: ['light', 'dark', 'system'],
              default: 'system',
            },
            defaultDashboard: {
              type: 'string',
              format: 'uuid',
            },
            refreshInterval: {
              type: 'number',
              minimum: 1000,
              maximum: 300000,
              default: 60000,
            },
            notifications: {
              $ref: '#/components/schemas/NotificationSettings',
            },
            accessibility: {
              $ref: '#/components/schemas/AccessibilitySettings',
            },
          },
          required: ['theme', 'refreshInterval'],
        },
        NotificationSettings: {
          type: 'object',
          properties: {
            priceAlerts: {
              type: 'boolean',
              default: true,
            },
            newsUpdates: {
              type: 'boolean',
              default: true,
            },
            systemMessages: {
              type: 'boolean',
              default: true,
            },
            emailNotifications: {
              type: 'boolean',
              default: false,
            },
          },
        },
        AccessibilitySettings: {
          type: 'object',
          properties: {
            highContrast: {
              type: 'boolean',
              default: false,
            },
            reducedMotion: {
              type: 'boolean',
              default: false,
            },
            screenReaderOptimized: {
              type: 'boolean',
              default: false,
            },
            fontSize: {
              type: 'string',
              enum: ['small', 'medium', 'large', 'extra-large'],
              default: 'medium',
            },
          },
        },
        // Asset schemas
        Asset: {
          type: 'object',
          properties: {
            symbol: {
              type: 'string',
              pattern: '^[A-Z]{1,10}$',
              description: 'Asset symbol (e.g., AAPL, GOOGL)',
            },
            name: {
              type: 'string',
              description: 'Full company/asset name',
            },
            price: {
              type: 'number',
              minimum: 0,
              description: 'Current price',
            },
            change: {
              type: 'number',
              description: 'Price change from previous close',
            },
            changePercent: {
              type: 'number',
              description: 'Percentage change from previous close',
            },
            volume: {
              type: 'number',
              minimum: 0,
              description: 'Trading volume',
            },
            marketCap: {
              type: 'number',
              minimum: 0,
              description: 'Market capitalization',
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time',
            },
            source: {
              type: 'string',
              enum: ['yahoo', 'google', 'alpha-vantage', 'cache'],
            },
            currency: {
              type: 'string',
              pattern: '^[A-Z]{3}$',
              default: 'USD',
            },
            exchange: {
              type: 'string',
            },
            assetType: {
              type: 'string',
              enum: [
                'stock',
                'etf',
                'mutual-fund',
                'bond',
                'commodity',
                'currency',
                'crypto',
                'index',
              ],
            },
          },
          required: [
            'symbol',
            'name',
            'price',
            'change',
            'changePercent',
            'volume',
            'lastUpdated',
            'source',
            'currency',
            'exchange',
            'assetType',
          ],
        },
        // Dashboard schemas
        Dashboard: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
            },
            description: {
              type: 'string',
              maxLength: 500,
            },
            isDefault: {
              type: 'boolean',
            },
            isPublic: {
              type: 'boolean',
            },
            ownerId: {
              type: 'string',
              format: 'uuid',
            },
            widgets: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Widget',
              },
            },
            layout: {
              $ref: '#/components/schemas/LayoutConfig',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
          required: [
            'id',
            'name',
            'isDefault',
            'isPublic',
            'ownerId',
            'widgets',
            'layout',
            'createdAt',
            'updatedAt',
          ],
        },
        Widget: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            type: {
              type: 'string',
              enum: [
                'asset-list',
                'asset-grid',
                'price-chart',
                'news-feed',
                'market-summary',
                'watchlist',
              ],
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
            },
            config: {
              type: 'object',
              description: 'Widget-specific configuration',
            },
            position: {
              $ref: '#/components/schemas/WidgetPosition',
            },
            size: {
              $ref: '#/components/schemas/WidgetSize',
            },
          },
          required: ['id', 'type', 'title', 'config', 'position', 'size'],
        },
        WidgetPosition: {
          type: 'object',
          properties: {
            x: {
              type: 'number',
              minimum: 0,
            },
            y: {
              type: 'number',
              minimum: 0,
            },
            w: {
              type: 'number',
              minimum: 1,
            },
            h: {
              type: 'number',
              minimum: 1,
            },
          },
          required: ['x', 'y', 'w', 'h'],
        },
        WidgetSize: {
          type: 'object',
          properties: {
            minW: {
              type: 'number',
              minimum: 1,
            },
            minH: {
              type: 'number',
              minimum: 1,
            },
            maxW: {
              type: 'number',
              minimum: 1,
            },
            maxH: {
              type: 'number',
              minimum: 1,
            },
            resizable: {
              type: 'boolean',
              default: true,
            },
          },
          required: ['minW', 'minH', 'resizable'],
        },
        LayoutConfig: {
          type: 'object',
          properties: {
            columns: {
              type: 'number',
              minimum: 1,
              maximum: 12,
              default: 4,
            },
            rows: {
              type: 'number',
              minimum: 1,
              maximum: 20,
              default: 6,
            },
            gap: {
              type: 'number',
              minimum: 0,
              default: 16,
            },
          },
          required: ['columns', 'rows', 'gap'],
        },
        // News schemas
        NewsArticle: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            title: {
              type: 'string',
            },
            summary: {
              type: 'string',
            },
            url: {
              type: 'string',
              format: 'uri',
            },
            publishedAt: {
              type: 'string',
              format: 'date-time',
            },
            source: {
              $ref: '#/components/schemas/NewsSource',
            },
            relatedAssets: {
              type: 'array',
              items: {
                type: 'string',
                pattern: '^[A-Z]{1,10}$',
              },
            },
            sentiment: {
              $ref: '#/components/schemas/SentimentAnalysis',
            },
            category: {
              type: 'string',
              enum: [
                'breaking-news',
                'market-news',
                'earnings',
                'company-news',
                'analysis',
              ],
            },
          },
          required: [
            'id',
            'title',
            'summary',
            'url',
            'publishedAt',
            'source',
            'relatedAssets',
            'category',
          ],
        },
        // News Source
        NewsSource: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            url: {
              type: 'string',
              format: 'uri',
            },
            reliability: {
              type: 'number',
              minimum: 0,
              maximum: 100,
            },
          },
          required: ['id', 'name', 'url', 'reliability'],
        },
        SentimentAnalysis: {
          type: 'object',
          properties: {
            score: {
              type: 'number',
              minimum: -1,
              maximum: 1,
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
            label: {
              type: 'string',
              enum: [
                'very-positive',
                'positive',
                'neutral',
                'negative',
                'very-negative',
              ],
            },
          },
          required: ['score', 'confidence', 'label'],
        },
      },
      responses: {
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        RateLimit: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management',
      },
      {
        name: 'Users',
        description: 'User profile and preferences management',
      },
      {
        name: 'Dashboards',
        description: 'Dashboard creation and management',
      },
      {
        name: 'Widgets',
        description: 'Widget configuration and data',
      },
      {
        name: 'Assets',
        description: 'Market data and asset information',
      },
      {
        name: 'News',
        description: 'News articles and content',
      },
      {
        name: 'Watchlists',
        description: 'Asset watchlist management',
      },
      {
        name: 'Cache',
        description: 'Cache management and statistics',
      },
      {
        name: 'System',
        description: 'System health and monitoring',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

/**
 * Generate OpenAPI specification
 */
export const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Setup Swagger UI middleware
 */
export function setupSwaggerUI(app: Express): void {
  // Serve API documentation
  app.use('/api-docs', swaggerUi.serve);
  app.get(
    '/api-docs',
    swaggerUi.setup(swaggerSpec, {
      customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { margin: 20px 0; }
    `,
      customSiteTitle: 'MarketPulse API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
      },
    })
  );

  // Serve OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

/**
 * Validate OpenAPI specification
 */
export function validateSwaggerSpec(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const spec = swaggerSpec as Record<string, unknown>;
    // Basic validation
    if (!spec.info) {
      errors.push('Missing API info section');
    }

    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      errors.push('No API paths defined');
    }

    if (!spec.components?.schemas) {
      errors.push('No component schemas defined');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Swagger spec generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
    };
  }
}
