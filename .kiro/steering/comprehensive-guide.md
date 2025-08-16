# MarketPulse Comprehensive Development Guide

## Product Overview

MarketPulse is a comprehensive financial dashboard platform that enables owner-configured suite of dynamic, curated dashboards that automatically surface for every user, while also giving each user the ability to create bespoke dashboards with custom asset watch-lists.

### Purpose

- Provide real-time market monitoring and analytics platform
- Aggregate data from multiple free sources (Yahoo Finance, Google Finance, etc.)
- Deliver actionable intelligence for traders, investors, and market analysts
- Ensure accessibility compliance (WCAG-AA) and responsive design across all devices

### Key Features

#### Core Functionality

- **Owner-configured default dashboards** - System-wide curated dashboards for all users
- **Custom user dashboards** - Bespoke watch-lists and personalization options
- **Real-time market data** - Live price updates, volume, market cap, and financial metrics
- **Multi-source data aggregation** - Yahoo Finance, Google Finance integration with fallback
- **Aggressive caching strategy** - API protection, rate limit management, and performance optimization

#### User Experience

- **WCAG-AA accessibility compliance** - Screen reader support, keyboard navigation, high contrast
- **Dark mode support** - Smooth theme transitions with user preference persistence
- **Responsive design** - Optimized for mobile, tablet, desktop, and ultra-wide screens
- **Dynamic data visualization** - Charts with technical indicators, zoom/pan, export capabilities
- **News integration** - Market news aggregation with asset tagging and sentiment analysis

#### Technical Features

- **Multiple API key management** - Automatic rotation and fallback on rate limits
- **Real-time updates** - WebSocket connections for live data streaming
- **Performance optimization** - Lazy loading, virtualization, and memory management
- **Comprehensive testing** - Unit, integration, E2E, accessibility, and performance testing

### Target Users

#### Primary Users

- **Traders** - Need real-time data, price alerts, and technical analysis tools
- **Investors** - Require portfolio tracking, historical data, and market news
- **Market Analysts** - Use charts, technical indicators, and comprehensive market data
- **Portfolio Managers** - Manage custom watchlists and monitor multiple assets

#### Secondary Users

- **System Administrators** - Configure default dashboards and manage API integrations
- **Developers** - Maintain and extend the platform with new features
- **Quality Assurance Engineers** - Ensure functionality and performance standards

## Technology Stack

### Frontend Stack

#### Core Framework

- **React 18** - Modern React with concurrent features and Suspense
- **TypeScript 5.x** - Strict type safety and compile-time error detection
- **Vite** - Fast development server and optimized production builds
- **React Router 6** - Client-side routing with nested routes and data loading

#### State Management

- **Zustand** - Lightweight state management for global application state
- **React Query (TanStack Query)** - Server state management with caching and background refetch
- **React Hook Form** - Performant forms with validation and error handling

#### Styling and Design

- **Tailwind CSS 3.x** - Utility-first CSS framework with custom design system
- **Headless UI** - Unstyled, accessible UI components
- **Framer Motion** - Smooth animations and micro-interactions
- **Lucide React** - Consistent icon library with accessibility support

#### Data Visualization

- **Chart.js 4.x** - Flexible charting library with technical indicators
- **Recharts** - React-specific charts with responsive design
- **D3.js (selective imports)** - Custom visualizations and data manipulation

#### Development Tools

- **ESLint** - Code linting with React and TypeScript rules
- **Prettier** - Code formatting with consistent style
- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing with accessibility focus
- **Playwright** - End-to-end testing across browsers

### Backend Stack

#### Core Framework

- **Node.js 18+** - JavaScript runtime with ES modules support
- **Express.js 4.x** - Web framework with middleware ecosystem
- **TypeScript 5.x** - Type safety for server-side code
- **Zod** - Runtime type validation and schema parsing

#### Database and Caching

- **SQLite 3** - Embedded database for local data storage
- **Redis** - In-memory caching with automatic fallback to memory cache
- **Prisma** - Type-safe database ORM with migrations
- **Node-cron** - Scheduled tasks for data refresh and cleanup

#### External Integrations

- **Axios** - HTTP client with interceptors and retry logic
- **WebSocket (ws)** - Real-time data streaming
- **Rate Limiter Flexible** - Advanced rate limiting with multiple strategies
- **Helmet** - Security middleware for Express applications

#### Development and Testing

- **Nodemon** - Development server with hot reload
- **Jest** - Backend unit and integration testing
- **Supertest** - HTTP assertion testing for APIs
- **Winston** - Structured logging with multiple transports

#### Version Control and Git Workflow

- **Git** - Distributed version control with conventional commits
- **Husky** - Git hooks for pre-commit validation and testing
- **lint-staged** - Run linters and formatters on staged files only
- **Conventional Commits** - Standardized commit message format
- **Git Flow** - Feature branch workflow with main/develop branches

## Project Structure

### Current Organization

```text
.
├── .kiro/                           # Kiro AI assistant configuration
│   ├── specs/                       # Feature specifications
│   │   └── market-pulse/            # MarketPulse specification
│   │       ├── requirements.md      # User stories and acceptance criteria
│   │       ├── design.md           # Technical architecture and design
│   │       ├── tasks.md            # Implementation plan with 17 major tasks
│   │       ├── project-context.md  # Command tracking and validation scripts
│   │       └── context/            # Task-specific context files
│   │           ├── 1-context.md    # Project setup context
│   │           ├── 2.1-context.md  # Backend server context
│   │           └── ...             # Additional task contexts
│   └── steering/                   # AI guidance documents
│       └── comprehensive-guide.md  # This consolidated guide
├── .vscode/                        # VSCode workspace settings
│   └── settings.json
└── (MarketPulse implementation files to be created)
```

### Planned MarketPulse Structure

#### Frontend Architecture (React/TypeScript)

```text
src/                                # Frontend source code
├── components/                     # Reusable UI components
│   ├── ui/                        # Base UI components (Button, Input, Modal)
│   ├── charts/                    # Unified chart components (single responsibility)
│   ├── widgets/                   # Dashboard widgets (Asset, News, Summary)
│   ├── layout/                    # Layout components (Header, Navigation, Grid)
│   └── forms/                     # Form components with validation
├── pages/                         # Page components and routing
│   ├── Dashboard.tsx              # Main dashboard page
│   ├── Settings.tsx               # User settings and preferences
│   └── NotFound.tsx               # 404 error page
├── hooks/                         # Custom React hooks
│   ├── useMarketData.ts           # Market data fetching and caching
│   ├── useWebSocket.ts            # Real-time data connections
│   └── useTheme.ts                # Theme management
├── services/                      # API services and external integrations
│   ├── api.ts                     # API client configuration
│   ├── marketData.ts              # Market data service
│   └── news.ts                    # News aggregation service
├── stores/                        # Zustand state management
│   ├── userStore.ts               # User preferences and settings
│   ├── dashboardStore.ts          # Dashboard configuration
│   └── marketStore.ts             # Market data cache
├── utils/                         # Utility functions and helpers
│   ├── validation.ts              # Data validation schemas (Zod)
│   ├── formatting.ts              # Number and date formatting
│   └── accessibility.ts           # A11y helper functions
├── styles/                        # Styling and design system
│   ├── globals.css                # Global styles and CSS variables
│   ├── components.css             # Component-specific styles
│   └── themes.css                 # Light/dark theme definitions
├── types/                         # TypeScript type definitions
│   ├── api.ts                     # API response types
│   ├── dashboard.ts               # Dashboard and widget types
│   └── market.ts                  # Market data types
└── assets/                        # Static assets
    ├── icons/                     # SVG icons and graphics
    └── images/                    # Images and logos
```

#### Backend Architecture (Node.js/Express)

```text
server/                            # Backend source code
├── src/                          # Server source code
│   ├── controllers/              # Request handlers
│   │   ├── dashboardController.ts # Dashboard CRUD operations
│   │   ├── assetController.ts     # Asset data endpoints
│   │   └── newsController.ts      # News aggregation endpoints
│   ├── models/                   # Database models and schemas
│   │   ├── User.ts               # User model with preferences
│   │   ├── Dashboard.ts          # Dashboard configuration model
│   │   └── Asset.ts              # Asset data model
│   ├── services/                 # Business logic services
│   │   ├── DataAggregationService.ts # Multi-source data fetching
│   │   ├── CacheService.ts       # Redis/memory caching
│   │   └── RateLimitService.ts   # API key rotation and rate limiting
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts               # Authentication middleware
│   │   ├── validation.ts         # Request validation
│   │   └── errorHandler.ts       # Global error handling
│   ├── routes/                   # API route definitions
│   │   ├── dashboards.ts         # Dashboard management routes
│   │   ├── assets.ts             # Asset data routes
│   │   └── system.ts             # Health check and system routes
│   ├── config/                   # Configuration management
│   │   ├── database.ts           # SQLite configuration
│   │   ├── cache.ts              # Redis configuration
│   │   └── apiKeys.ts            # External API configuration
│   └── utils/                    # Server utilities
│       ├── logger.ts             # Structured logging
│       ├── validation.ts         # Data validation helpers
│       └── security.ts           # Security utilities
├── migrations/                   # Database migrations
├── seeds/                        # Database seed data
└── tests/                        # Backend tests
    ├── unit/                     # Unit tests
    ├── integration/              # API integration tests
    └── fixtures/                 # Test data fixtures
```

## Development Guidelines

### Mandatory Requirements

#### Zero-Error Policy

- **No compilation errors**: TypeScript must compile without errors
- **No linting warnings**: ESLint must pass with zero warnings
- **No console errors**: Browser console must be clean in development and production
- **API contract integrity**: When updating APIs, always update both frontend and backend simultaneously

#### Code Quality Standards

- **Single responsibility**: Each file, function, and component handles one concern
- **Explicit typing**: All public functions must have explicit return types
- **Error boundaries**: Implement proper error handling with meaningful HTTP status codes
- **Input validation**: Use Zod schemas for all API inputs and user data

### Architecture Patterns

#### Frontend (React/TypeScript)

```typescript
// Component Pattern
export const AssetWidget: React.FC<AssetWidgetProps> = ({
  symbol,
  ...props
}) => {
  const { data, error, isLoading } = useMarketData(symbol);
  // Component logic here
};

// Custom Hook Pattern
export const useMarketData = (symbol: string): MarketDataResult => {
  // Hook implementation
};
```

#### Backend (Node.js/Express)

```typescript
// Controller Pattern
export const getDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await dashboardService.getDashboard(req.params.id);
  res.json(result);
};

// Service Pattern
export class DashboardService {
  async getDashboard(id: string): Promise<Dashboard> {
    // Business logic here
  }
}
```

#### State Management

- **Zustand**: Global application state (user preferences, theme)
- **React Query**: Server state with caching (market data, API responses)
- **Local state**: Component-specific state with useState/useReducer

### File Organization Rules

#### Naming Conventions

- **Components**: PascalCase (`AssetWidget.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useMarketData.ts`)
- **Services**: camelCase (`marketDataService.ts`)
- **Types**: PascalCase (`MarketData.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

#### Directory Structure

```text
src/
├── components/ui/          # Reusable UI components
├── components/widgets/     # Dashboard-specific widgets
├── hooks/                  # Custom React hooks
├── services/              # API and business logic
├── stores/                # Zustand state stores
├── types/                 # TypeScript definitions
└── utils/                 # Pure utility functions
```

### Code Improvement Guidelines

#### File Enhancement Policy
- **Improve existing functionality** instead of creating alternative versions
- **Never create files** with names like `enhanced*`, `*v2`, `improved*`, `*-new`, `*-updated`, etc.
- **Always modify the original file** when enhancing functionality
- **Maintain single source of truth** for each component or feature
- **Refactor in place** rather than duplicating with variations

### MarketPulse-Specific Rules

#### Data Fetching Strategy

- **Primary source**: Yahoo Finance API
- **Fallback source**: Google Finance API
- **Caching**: Redis (primary) → Memory cache (fallback)
- **Rate limiting**: Automatic API key rotation on 429 responses

#### UI/UX Requirements

- **Accessibility**: WCAG-AA compliance mandatory
- **Responsive**: Mobile-first design with breakpoints at 640px, 768px, 1024px
- **Performance**: Lazy load components, virtualize large lists
- **Theme**: Support light/dark modes with smooth transitions

#### API Design

```typescript
// Response format
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
}

// Error handling
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("API Error:", error);
  res.status(500).json({ success: false, error: error.message });
});
```

### Development Workflow

#### Before Starting Any Task

1. Read existing code to understand patterns
2. Check if similar functionality exists
3. Plan the minimal implementation needed
4. Identify what tests need to be written

#### Implementation Process

1. **Write types first**: Define TypeScript interfaces
2. **Create tests**: Write failing tests for new functionality
3. **Implement**: Write minimal code to pass tests
4. **Refactor**: Clean up and optimize
5. **Validate**: Run full test suite and linting

#### Git Commit Standards

```bash
feat: add real-time price updates for dashboard widgets
fix: resolve chart rendering issue on mobile devices
refactor: extract market data logic into reusable service
test: add unit tests for dashboard configuration
docs: update API documentation for asset endpoints
```

### Testing Requirements

#### Test Organization

```text
tests/
├── unit/core/              # Core functionality
├── unit/widgets/           # Widget components
├── integration/api/        # API endpoints
└── e2e/workflows/          # User journeys
```

#### Coverage Requirements

- **Unit tests**: All services and utilities
- **Integration tests**: All API endpoints
- **E2E tests**: Critical user workflows
- **Accessibility tests**: All interactive components

### Validation Checklist

#### Before Committing

- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm test` passes all tests
- [ ] `npm run build` completes successfully
- [ ] Browser console shows no errors
- [ ] Accessibility tests pass

#### Before Deployment

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] External API keys tested
- [ ] Performance benchmarks met
- [ ] Security headers configured

## Common Commands

### Development Commands

```bash
# Install dependencies
npm install

# Start development servers (frontend + backend)
npm run dev

# Start frontend only
npm run dev:client

# Start backend only
npm run dev:server

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run lint:fix
npm run format
```

### Testing Commands

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Test coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Build and Deployment Commands

```bash
# Production build
npm run build

# Preview production build
npm run preview

# Deploy to production (with validation)
./scripts/deploy.sh production

# Run production stack locally
npm run start:prod

# Database migrations
npm run db:migrate
npm run db:seed
```

### Quality Assurance Commands

```bash
# Full quality check (lint + type + test)
npm run qa

# Performance testing
npm run test:performance

# Accessibility testing
npm run test:a11y

# Bundle analysis
npm run analyze

# Security audit
npm audit
npm run audit:fix
```

### Git Workflow Commands

```bash
# Initialize repository with proper .gitignore
git init
git add .gitignore
git commit -m "chore: initialize git repository with .gitignore"

# Conventional commit examples
git commit -m "feat: add user dashboard component"
git commit -m "fix: resolve chart rendering issue"
git commit -m "refactor: extract chart logic into reusable service"
git commit -m "test: add unit tests for market data service"
git commit -m "docs: update API documentation"

# Pre-commit validation (automated via Husky)
npm run pre-commit

# Check git status and working directory
git status
git diff --staged

# Create feature branch for major tasks
git checkout -b feature/task-1-project-setup
git checkout -b feature/task-2-backend-infrastructure

# Merge completed tasks to main
git checkout main
git merge feature/task-1-project-setup
git tag v0.1.0-task-1-complete
```

## Code Style Guidelines

### TypeScript Standards

- **Strict mode enabled** - No implicit any, strict null checks
- **Interface over type** - Use interfaces for object shapes
- **Explicit return types** - For public functions and methods
- **Generic constraints** - Use extends for type safety
- **Utility types** - Leverage built-in utility types (Pick, Omit, etc.)

### React Best Practices

- **Functional components** - Use hooks instead of class components
- **Custom hooks** - Extract reusable logic into custom hooks
- **Prop validation** - Use TypeScript interfaces for prop types
- **Error boundaries** - Implement error boundaries for component trees
- **Accessibility first** - ARIA labels, semantic HTML, keyboard navigation

### Backend Standards

- **Express middleware** - Use middleware for cross-cutting concerns
- **Error handling** - Centralized error handling with proper HTTP status codes
- **Input validation** - Validate all inputs with Zod schemas
- **Async/await** - Use async/await over promises for readability
- **Structured logging** - Use Winston with consistent log levels

### File Organization

- **Single responsibility** - One concept per file
- **Barrel exports** - Use index.ts files for clean imports
- **Absolute imports** - Configure path mapping for cleaner imports
- **Co-location** - Keep related files close together
- **Consistent naming** - Follow established naming conventions

### Performance Guidelines

- **Code splitting** - Use dynamic imports for route-based splitting
- **Lazy loading** - Implement lazy loading for heavy components
- **Memoization** - Use React.memo and useMemo appropriately
- **Bundle optimization** - Tree shaking and dead code elimination
- **Caching strategies** - Implement multi-level caching

### Security Best Practices

- **Input sanitization** - Sanitize all user inputs
- **HTTPS enforcement** - Use HTTPS in production
- **CORS configuration** - Proper CORS setup for API endpoints
- **Rate limiting** - Implement rate limiting for API endpoints
- **Environment variables** - Secure configuration management

### Testing Standards

- **Test-driven development** - Write tests before implementation
- **Feature-based organization** - Group tests by feature buckets
- **Comprehensive coverage** - Unit, integration, E2E, and accessibility tests
- **Mock external dependencies** - Use mocks for external APIs
- **Accessibility testing** - Include a11y tests in the test suite

### Systematic Testing Framework

- **test-results.md tracking** - Central documentation of all testing progress
- **11 test categories** - Comprehensive coverage from structure to production
- **Issue-driven development** - All problems logged, tracked, and resolved
- **Zero-error policy** - No test marked complete until fully passing
- **Step-by-step validation** - Sequential execution with progress tracking

### Testing Workflow Commands

```bash
# Testing validation workflow
# 1. Check test-results.md status
cat test-results.md

# 2. Execute tests systematically
npm run test                    # Unit tests
npm run lint                    # Code quality
npm run type-check             # TypeScript validation
npm run build                  # Production build
./scripts/deploy.sh production # Full deployment validation

# 3. Update test-results.md with outcomes
# 4. Fix issues one by one
# 5. Re-run tests until passing
# 6. Mark tests complete only when zero errors
```

## Success Metrics

- **Performance:** Sub-200ms response times for cached data
- **Accessibility:** 100% WCAG-AA compliance across all features
- **Reliability:** 99.9% uptime with graceful degradation
- **User Experience:** Zero console errors, smooth animations, responsive design
- **Code Quality:** 100% test coverage, zero linting warnings, modular architecture

## Testing and Validation Framework

### Systematic Testing Approach

- **test-results.md tracking**: All testing progress documented with issues and fixes
- **Step-by-step validation**: Each test category executed systematically
- **Issue tracking**: All problems logged, fixed, and marked complete
- **Comprehensive coverage**: 11 test categories covering all aspects of the application

### Test Categories

1. **Project Structure Tests** - Validate directory structure and file organization
2. **Package Configuration Tests** - Verify dependencies and build configuration
3. **Frontend Build Tests** - Test React/TypeScript compilation and bundling
4. **Backend Build Tests** - Test Node.js/Express server compilation
5. **Linting Tests** - Code quality and style compliance validation
6. **TypeScript Compilation Tests** - Type safety and compilation verification
7. **Unit Tests** - Comprehensive unit test suite execution
8. **Development Server Tests** - Local development environment validation
9. **Database Tests** - Database connectivity and migration testing
10. **API Endpoint Tests** - Backend API functionality validation
11. **Production Build Tests** - Production deployment readiness verification

### Quality Gates

- **Zero-error policy**: No test can be marked complete with unresolved errors
- **Regression prevention**: All existing functionality must continue working
- **Documentation requirement**: All issues and fixes must be documented
- **Completion criteria**: Tests only marked done when fully passing