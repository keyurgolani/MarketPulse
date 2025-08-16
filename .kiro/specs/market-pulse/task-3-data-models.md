# Task 3: Data Models and Type Definitions

**Context File:** `.kiro/specs/market-pulse/context/3-context.md`
**Objective:** Create type-safe, validated data models with comprehensive error handling
**Exit Criteria:** All interfaces defined, validation schemas work, type safety enforced at compile time, tests pass
**Git Commits:** Create commits after each major milestone (type definitions, validation schemas, API contracts)

## Task 3.1: Create core TypeScript interfaces and data models

**Context File:** `.kiro/specs/market-pulse/context/3.1-context.md`
**Exit Criteria:** All interfaces defined, validation schemas work, type safety enforced at compile time, tests pass

- [ ] ### Task 3.1.1: Define shared type definitions and interfaces

**Files to create:** `src/types/api.ts`, `src/types/dashboard.ts`, `src/types/market.ts`, `src/types/user.ts`
**Detailed Implementation:**
- Create `src/types/api.ts` with API response types:
  ```typescript
  export interface ApiResponse<T> {
    data: T;
    success: boolean;
    error?: string;
    timestamp: number;
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    success: boolean;
    timestamp: number;
  }
  
  export interface ErrorResponse {
    error: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path?: string;
  }
  ```
- Define core interfaces: `User`, `Dashboard`, `Widget`, `Asset`, `NewsArticle`, `MarketData`
- Create API response types: `ApiResponse<T>`, `PaginatedResponse<T>`, `ErrorResponse`
- Define utility types for form handling, validation, and state management
- Add comprehensive JSDoc documentation for all interfaces
- Create type guards and utility functions for type checking
**Validation:** TypeScript compiles without errors, interfaces properly exported
**Commit:** `feat: define core TypeScript interfaces and API types`
**Requirements:** Type safety foundation (Requirement 11)

- [ ] ### Task 3.1.2: Create user and preference data models

**Files to create:** `src/types/user.ts`, `server/src/models/types/user.ts`
**Detailed Implementation:**
- Create `src/types/user.ts`:
  ```typescript
  export interface User {
    id: string;
    email: string;
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    defaultDashboard?: string;
    refreshInterval: number;
    notifications: NotificationSettings;
    accessibility: AccessibilitySettings;
  }
  
  export interface NotificationSettings {
    priceAlerts: boolean;
    newsUpdates: boolean;
    systemMessages: boolean;
    emailNotifications: boolean;
  }
  
  export interface AccessibilitySettings {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReaderOptimized: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  }
  ```
- Define user authentication and session types
- Create user preference validation schemas
- Add user role and permission types
- Define user activity and audit trail types
**Validation:** User types compile correctly, validation schemas work
**Commit:** `feat: create user and preference data models`
**Requirements:** User preferences (Requirement 7, 6)

- [ ] ### Task 3.1.3: Define dashboard and widget data structures

**Files to create:** `src/types/dashboard.ts`, `src/types/widget.ts`
**Detailed Implementation:**
- Create `src/types/dashboard.ts`:
  ```typescript
  export interface Dashboard {
    id: string;
    name: string;
    description?: string;
    isDefault: boolean;
    isPublic: boolean;
    ownerId: string;
    widgets: Widget[];
    layout: LayoutConfig;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface LayoutConfig {
    columns: number;
    rows: number;
    gap: number;
    responsive: ResponsiveConfig;
  }
  
  export interface ResponsiveConfig {
    mobile: { columns: number; rows: number };
    tablet: { columns: number; rows: number };
    desktop: { columns: number; rows: number };
    ultrawide: { columns: number; rows: number };
  }
  
  export interface Widget {
    id: string;
    type: WidgetType;
    title: string;
    config: WidgetConfig;
    position: WidgetPosition;
    size: WidgetSize;
  }
  
  export type WidgetType = 'asset-list' | 'chart' | 'news' | 'market-summary' | 'watchlist';
  
  export interface WidgetConfig {
    assets?: string[];
    timeframe?: string;
    indicators?: string[];
    displayMode?: 'list' | 'grid' | 'chart';
    refreshInterval?: number;
    customSettings?: Record<string, any>;
  }
  
  export interface WidgetPosition {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  
  export interface WidgetSize {
    minW: number;
    minH: number;
    maxW?: number;
    maxH?: number;
  }
  ```
- Define widget configuration and layout types
- Create dashboard template and sharing types
- Add dashboard permission and access control types
- Define dashboard export and import types
**Validation:** Dashboard types compile correctly, widget configurations valid
**Commit:** `feat: define dashboard and widget data structures`
**Requirements:** Dashboard functionality (Requirement 1, 2, 9)

- [ ] ### Task 3.1.4: Create market data and asset type definitions

**Files to create:** `src/types/market.ts`, `src/types/asset.ts`
**Detailed Implementation:**
- Create `src/types/market.ts`:
  ```typescript
  export interface Asset {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap?: number;
    dayHigh?: number;
    dayLow?: number;
    yearHigh?: number;
    yearLow?: number;
    lastUpdated: Date;
    source: DataSource;
    currency: string;
    exchange: string;
  }
  
  export interface HistoricalData {
    symbol: string;
    timeframe: string;
    data: PricePoint[];
    indicators?: TechnicalIndicators;
  }
  
  export interface PricePoint {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }
  
  export interface TechnicalIndicators {
    sma?: number[];
    ema?: number[];
    rsi?: number[];
    macd?: MACDData[];
    bollinger?: BollingerBands[];
  }
  
  export interface MACDData {
    timestamp: Date;
    macd: number;
    signal: number;
    histogram: number;
  }
  
  export interface BollingerBands {
    timestamp: Date;
    upper: number;
    middle: number;
    lower: number;
  }
  
  export type DataSource = 'yahoo' | 'google' | 'alpha-vantage' | 'cache';
  
  export interface MarketSummary {
    indices: MarketIndex[];
    topGainers: Asset[];
    topLosers: Asset[];
    mostActive: Asset[];
    lastUpdated: Date;
  }
  
  export interface MarketIndex {
    symbol: string;
    name: string;
    value: number;
    change: number;
    changePercent: number;
  }
  ```
- Define asset search and filtering types
- Create market sector and industry classification types
- Add financial metrics and ratios types
- Define price alert and notification types
**Validation:** Market data types compile correctly, data structures valid
**Commit:** `feat: create market data and asset type definitions`
**Requirements:** Market data handling (Requirement 3, 4)

- [ ] ### Task 3.1.5: Define news and content data models

**Files to create:** `src/types/news.ts`, `src/types/content.ts`
**Detailed Implementation:**
- Create `src/types/news.ts`:
  ```typescript
  export interface NewsArticle {
    id: string;
    title: string;
    summary: string;
    content?: string;
    url: string;
    publishedAt: Date;
    source: NewsSource;
    author?: string;
    relatedAssets: string[];
    sentiment?: SentimentAnalysis;
    category: NewsCategory;
    tags: string[];
    imageUrl?: string;
  }
  
  export interface NewsSource {
    name: string;
    url: string;
    reliability: number;
    bias?: 'left' | 'center' | 'right';
  }
  
  export interface SentimentAnalysis {
    score: number; // -1 to 1
    confidence: number; // 0 to 1
    label: 'positive' | 'negative' | 'neutral';
  }
  
  export type NewsCategory = 
    | 'market-news'
    | 'earnings'
    | 'economic-data'
    | 'company-news'
    | 'analysis'
    | 'breaking-news';
  
  export interface NewsFilter {
    sources?: string[];
    categories?: NewsCategory[];
    assets?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    sentiment?: 'positive' | 'negative' | 'neutral';
  }
  ```
- Define content aggregation and filtering types
- Create news source and reliability scoring types
- Add content categorization and tagging types
- Define news search and recommendation types
**Validation:** News types compile correctly, content structures valid
**Commit:** `feat: define news and content data models`
**Requirements:** News integration (Requirement 5)

- [ ] ### Task 3.1.6: Create validation schemas with Zod

**Files to create:** `src/utils/validation.ts`, `server/src/utils/validation.ts`
**Commands:** `npm install zod`
**Detailed Implementation:**
- Install Zod for runtime validation: `npm install zod`
- Create `src/utils/validation.ts`:
  ```typescript
  import { z } from 'zod';
  
  // User validation schemas
  export const UserPreferencesSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    defaultDashboard: z.string().optional(),
    refreshInterval: z.number().min(1000).max(300000).default(60000),
    notifications: z.object({
      priceAlerts: z.boolean().default(true),
      newsUpdates: z.boolean().default(true),
      systemMessages: z.boolean().default(true),
      emailNotifications: z.boolean().default(false)
    }).default({}),
    accessibility: z.object({
      highContrast: z.boolean().default(false),
      reducedMotion: z.boolean().default(false),
      screenReaderOptimized: z.boolean().default(false),
      fontSize: z.enum(['small', 'medium', 'large', 'extra-large']).default('medium')
    }).default({})
  });
  
  // Dashboard validation schemas
  export const DashboardSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    isDefault: z.boolean().default(false),
    isPublic: z.boolean().default(false),
    ownerId: z.string().uuid(),
    widgets: z.array(z.any()).default([]),
    layout: z.object({
      columns: z.number().min(1).max(12).default(4),
      rows: z.number().min(1).max(20).default(6),
      gap: z.number().min(0).max(50).default(16)
    }).default({})
  });
  
  // Asset validation schemas
  export const AssetSchema = z.object({
    symbol: z.string().min(1).max(10),
    name: z.string().min(1).max(200),
    price: z.number().positive(),
    change: z.number(),
    changePercent: z.number(),
    volume: z.number().nonnegative(),
    marketCap: z.number().positive().optional(),
    lastUpdated: z.date(),
    source: z.enum(['yahoo', 'google', 'alpha-vantage', 'cache']),
    currency: z.string().length(3).default('USD'),
    exchange: z.string().min(1).max(50)
  });
  ```
- Create validation schemas for all data models
- Add input sanitization and data transformation
- Implement validation error handling and reporting
- Create validation middleware for API endpoints
- Add client-side form validation schemas
**Validation:** Validation schemas work correctly, error handling functional
**Commit:** `feat: create comprehensive validation schemas with Zod`
**Requirements:** Data validation and security (Requirement 13)

## Task 3.2: Implement API contracts and request/response types

**Context File:** `.kiro/specs/market-pulse/context/3.2-context.md`
**Exit Criteria:** API contracts defined, request/response types validated, OpenAPI documentation generated

- [ ] ### Task 3.2.1: Define API endpoint contracts

**Files to create:** `src/types/api-contracts.ts`, `server/src/types/api-contracts.ts`
**Detailed Implementation:**
- Create comprehensive API endpoint definitions
- Define request and response types for all endpoints
- Add parameter validation and documentation
- Create API versioning and compatibility types
- Define error response standardization
- Add API rate limiting and throttling types
**Validation:** API contracts compile correctly, types match implementation
**Commit:** `feat: define comprehensive API endpoint contracts`
**Requirements:** API consistency (Requirement 3, 4, 13)

- [ ] ### Task 3.2.2: Create request validation middleware

**Files to create:** `server/src/middleware/validation.ts`, `server/src/utils/requestValidation.ts`
**Detailed Implementation:**
- Implement request validation middleware using Zod schemas
- Add parameter sanitization and transformation
- Create validation error formatting and response
- Implement file upload validation and security
- Add request size and rate limiting validation
- Create validation logging and monitoring
**Validation:** Request validation works correctly, security enforced
**Commit:** `feat: implement request validation middleware`
**Requirements:** Input validation and security (Requirement 13)

- [ ] ### Task 3.2.3: Generate OpenAPI documentation

**Files to create:** `docs/api-spec.yaml`, `server/src/utils/swagger.ts`
**Commands:** `npm install swagger-jsdoc swagger-ui-express`
**Detailed Implementation:**
- Install Swagger dependencies: `npm install swagger-jsdoc swagger-ui-express`
- Generate OpenAPI 3.0 specification from code
- Create interactive API documentation
- Add example requests and responses
- Document authentication and authorization
- Create API testing and validation tools
**Validation:** API documentation generates correctly, examples work
**Commit:** `feat: generate comprehensive OpenAPI documentation`
**Requirements:** API documentation (Requirement 11)

## Task 3.3: Create error handling and logging types

**Context File:** `.kiro/specs/market-pulse/context/3.3-context.md`
**Exit Criteria:** Error types defined, logging structured, error handling comprehensive

- [ ] ### Task 3.3.1: Define error types and error handling

**Files to create:** `src/types/errors.ts`, `server/src/types/errors.ts`
**Detailed Implementation:**
- Create comprehensive error type definitions
- Define error codes and categorization
- Add error context and metadata types
- Create error recovery and retry types
- Define user-friendly error message types
- Add error tracking and analytics types
**Validation:** Error types compile correctly, error handling comprehensive
**Commit:** `feat: define comprehensive error types and handling`
**Requirements:** Error handling (Requirement 13)

- [ ] ### Task 3.3.2: Implement structured logging types

**Files to create:** `src/types/logging.ts`, `server/src/types/logging.ts`
**Detailed Implementation:**
- Define structured logging interfaces
- Create log level and category types
- Add performance monitoring types
- Define audit trail and security logging types
- Create log aggregation and analysis types
- Add log retention and archival types
**Validation:** Logging types work correctly, structured format maintained
**Commit:** `feat: implement structured logging types`
**Requirements:** Monitoring and debugging (Requirement 13, 14)

- [ ] ### Task 3.3.3: Write comprehensive type definition tests

**Files to create:** `src/__tests__/types.test.ts`, `server/src/__tests__/types.test.ts`
**Detailed Implementation:**
- Create tests for all type definitions and interfaces
- Test validation schemas with valid and invalid data
- Write tests for type guards and utility functions
- Test API contract compliance
- Add performance tests for validation schemas
- Create type safety regression tests
**Validation:** All type tests pass, validation schemas work correctly
**Commit:** `test: add comprehensive type definition tests`
**Requirements:** Testing validation (Requirement 15, 16)