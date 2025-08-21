---
inclusion: always
---

# MarketPulse Development Guide

## Product Overview

MarketPulse is a financial dashboard platform with owner-configured default dashboards and custom user watchlists. Real-time market data aggregation from Yahoo Finance and Google Finance with aggressive caching and WCAG-AA accessibility compliance.

### Core Features

- Owner-configured system dashboards for all users
- Custom user dashboards with bespoke watchlists
- Real-time market data with WebSocket updates
- Multi-source data aggregation with fallback
- Dark/light theme support with responsive design

## Technology Stack

### Frontend

- **React 18** + **TypeScript 5.x** + **Vite** - Core framework with strict typing
- **Zustand** - Global state management
- **React Query** - Server state with caching
- **Tailwind CSS** + **Headless UI** - Styling with accessibility
- **Chart.js** + **Recharts** - Data visualization
- **Vitest** + **React Testing Library** - Testing framework

### Backend

- **Node.js 18+** + **Express.js** + **TypeScript** - Server framework
- **SQLite** + **Redis** - Database and caching (Redis fallback to memory)
- **Zod** - Runtime validation
- **Winston** - Structured logging
- **WebSocket** - Real-time updates

## Project Structure

### Frontend (`src/`)

```
components/
├── ui/          # Base components (Button, Input, Modal)
├── widgets/     # Dashboard widgets (Asset, News, Summary)
└── layout/      # Layout components (Header, Navigation)

hooks/           # Custom React hooks (useMarketData, useWebSocket)
services/        # API services (marketData, news)
stores/          # Zustand state (userStore, dashboardStore)
types/           # TypeScript definitions
utils/           # Utility functions and validation
```

### Backend (`server/src/`)

```
controllers/     # Request handlers (dashboard, asset, news)
models/          # Database models (User, Dashboard, Asset)
services/        # Business logic (DataAggregation, Cache, RateLimit)
middleware/      # Express middleware (auth, validation, errorHandler)
routes/          # API routes (dashboards, assets, system)
config/          # Configuration (database, cache, apiKeys)
utils/           # Server utilities (logger, validation, security)
```

## Development Rules

### Zero-Error Policy

- TypeScript must compile without errors
- ESLint must pass with zero warnings
- Browser console must be clean
- Never use `any` type - always use specific types
- API changes must update both frontend and backend simultaneously

### Code Standards

- **Single responsibility** - One concern per file/function/component
- **Explicit typing** - All public functions have explicit return types
- **Input validation** - Use Zod schemas for all inputs
- **Error handling** - Proper HTTP status codes and error boundaries

### Naming Conventions

- Components: `PascalCase` (`AssetWidget.tsx`)
- Hooks: `camelCase` with 'use' prefix (`useMarketData.ts`)
- Services: `camelCase` (`marketDataService.ts`)
- Types: `PascalCase` (`MarketData.ts`)
- Constants: `UPPER_SNAKE_CASE`

### Architecture Patterns

#### Component Pattern

```typescript
export const AssetWidget: React.FC<AssetWidgetProps> = ({ symbol }) => {
  const { data, error, isLoading } = useMarketData(symbol);
  // Component logic
};
```

#### Service Pattern

```typescript
export class DashboardService {
  async getDashboard(id: string): Promise<Dashboard> {
    // Business logic
  }
}
```

### State Management

- **Zustand**: Global state (user preferences, theme)
- **React Query**: Server state with caching
- **Local state**: Component-specific with useState/useReducer

### File Enhancement Policy

- **Improve existing files** instead of creating alternatives
- **Never create** files with names like `enhanced*`, `*v2`, `*-new`
- **Refactor in place** rather than duplicating
- **Maintain single source of truth** for each feature

### MarketPulse-Specific Rules

#### Data Strategy

- **Primary**: Yahoo Finance API
- **Fallback**: Google Finance API
- **Caching**: Redis → Memory cache fallback
- **Rate limiting**: Auto API key rotation on 429 responses

#### UI Requirements

- **WCAG-AA compliance** mandatory
- **Mobile-first** responsive design (640px, 768px, 1024px breakpoints)
- **Dark/light themes** with smooth transitions
- **Performance**: Lazy loading, virtualization

#### API Format

```typescript
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
}
```

## Development Workflow

### Implementation Process

1. **Types first** - Define TypeScript interfaces
2. **Tests** - Write failing tests for new functionality
3. **Implement** - Write minimal code to pass tests
4. **Validate** - Run full test suite and linting

### Git Commit Standards

```bash
feat: add real-time price updates for dashboard widgets
fix: resolve chart rendering issue on mobile devices
refactor: extract market data logic into reusable service
test: add unit tests for dashboard configuration
```

### Pre-Commit Checklist

- `npm run type-check` passes
- `npm run lint` passes with zero warnings
- `npm test` passes all tests
- `npm run build` completes successfully
- Browser console shows no errors

## Common Commands

### Development

```bash
npm install                    # Install dependencies
npm run dev                    # Start frontend + backend
npm run dev:client             # Frontend only
npm run dev:server             # Backend only
npm run type-check             # TypeScript validation
npm run lint                   # Code linting
npm run format                 # Code formatting
```

### Testing

```bash
npm test                       # Run all tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:e2e               # End-to-end tests
npm run test:coverage          # Coverage report
```

### Build & Deploy

```bash
npm run build                  # Production build
npm run preview                # Preview build
./scripts/deploy.sh production # Deploy with validation
npm run db:migrate             # Database migrations
```

## Code Style Guidelines

### TypeScript Standards

- **Strict mode enabled** - No implicit any, strict null checks
- **No `any` type** - Always use specific types
- **Interfaces over types** - For object shapes
- **Explicit return types** - For public functions
- **Utility types** - Leverage Pick, Omit, etc.

### React Best Practices

- **Functional components** with hooks
- **Custom hooks** for reusable logic
- **TypeScript interfaces** for prop validation
- **Error boundaries** for component trees
- **Accessibility first** - ARIA labels, semantic HTML

### Backend Standards

- **Express middleware** for cross-cutting concerns
- **Centralized error handling** with proper HTTP status codes
- **Zod validation** for all inputs
- **Async/await** over promises
- **Winston structured logging**

### Performance Guidelines

- **Code splitting** with dynamic imports
- **Lazy loading** for heavy components
- **React.memo and useMemo** appropriately
- **Multi-level caching** strategies

### Security Requirements

- **Input sanitization** for all user data
- **HTTPS enforcement** in production
- **CORS configuration** for API endpoints
- **Rate limiting** implementation
- **Secure environment variables**

## Task-Level Context Management

### Context File Requirements

- Create/update `<task_name>.md` for each task in `.kiro/specs/market-pulse/context/`
- Record: objective, context gathered, changes made
- Load existing context at task start and resume from checkpoint
- Update continuously during task execution

### Task Structure Requirements

- Each task must have implementation and validation checkboxes
- Implementation and validation sections for each task
- Clear exit criteria for tasks and sub-steps
- Only mark done when both implementation and validation complete

### Task Execution Rules

- Begin with thorough code analysis to identify exact fix locations
- Define crisp exit criteria before starting
- Run lint, build, deploy checks after every change
- Verify backend-frontend integration consistency
- Use browser console logs and puppeteer for validation
- Iterate until zero errors remain

## Test-Driven Development Requirements

### TDD Workflow

- Write comprehensive tests BEFORE implementing components
- Create/update test files before writing component code
- Write component code to satisfy tests and requirements
- Do NOT modify tests to match failing code
- Ensure all tests pass before proceeding

### Test Categories and Execution

- Use `test-results.md` to track all test types and execution
- Execute tests systematically, logging results and issues
- Fix issues one by one, updating test results
- Mark tests done only when fully passing
- Re-run tests after fixes to verify resolution

## Code Quality and Standards

### TypeScript Strict Requirements

- NEVER use `any` type anywhere in non-test code
- Always identify and use correct specific types
- Use `unknown` instead of `any` when type is truly unknown
- Explicit return types for all public functions
- Strict null checks and proper error handling

### Code Organization

- Break large files into single-responsibility modules
- Eliminate duplicate implementations
- Remove unused code and imports
- Make code more readable and maintainable
- Follow single source of truth principle

### File Enhancement Policy

- Improve existing files instead of creating alternatives
- Never create files with names like `enhanced*`, `*v2`, `*-new`
- Refactor in place rather than duplicating
- Maintain single source of truth for each feature

## Validation and Quality Assurance

### Comprehensive Validation Requirements

- Application must load cleanly in production environment
- All features must work with proper error handling
- Browser console must show zero errors
- All tests must pass for implemented functionality
- No regression in existing functionality

### Linting and Standards

- Resolve ALL lint warnings across entire codebase
- Apply linting to complete repository
- Enforce highest code quality standards
- Do not accept barely-meeting quality bar results

### Production Readiness

- Run `./scripts/deploy.sh production` successfully
- Validate all application aspects end-to-end
- Ensure UI shows correct components
- Verify all features available to users
- Confirm operational condition

## Safety and Error Handling

### Command Safety

- Add timeouts to commands that may hang
- Never bypass contingent authorization
- Use proper error handling and recovery
- Document failed commands and alternatives in project context

### Root Cause Analysis

- Do not create sample, simple, or workaround versions
- Analyze issues thoroughly to identify all causes
- Resolve issues at root with minimal side effects
- Ensure no functionality regression

## Documentation and Traceability

### Design Documentation

- Document any changes that differ from design
- Update design document with current application state
- Maintain up-to-date snapshot of architecture
- Track deviations and decisions made during implementation

### Project Context Maintenance

- Record failed commands and working alternatives
- Track temporary/debug/test files and purposes
- Document reusable validation scripts
- Maintain known issues and solutions

## Implementation Guidelines

### Functional First Approach

- Focus on making things work functionally first
- Over-engineer for sophistication after functionality complete
- Prioritize working features over perfect architecture initially
- Refine and optimize once core functionality proven

### Modular Architecture

- Create tightly coupled models for compile-time error catching
- Ensure code correctness can be verified at build time
- Avoid runtime failures through strong typing
- Implement proper validation at boundaries

### Clean-up and Maintenance

- Remove, clean up, and refactor unused components
- Ensure linting applied to whole codebase
- Fix all errors and warnings during linting
- Maintain clean, organized codebase

## Advanced Development Guidelines

### Task-Level Context Management (Mandatory)

#### Context File Requirements

- **Create/update** `<task_name>.md` for each task in `.kiro/specs/market-pulse/context/`
- **Record**: objective, context gathered so far, changes made for that task
- **Load existing context** at task start and resume from checkpoint
- **Update continuously** during task execution after every step

#### Task Structure Requirements

- Each task must have **implementation and validation checkboxes**
- **Implementation and validation sections** for each task
- **Clear exit criteria** for tasks and sub-steps
- Only mark done when **both implementation and validation complete**

#### Task Execution Rules

- Begin with **thorough code analysis** to identify exact fix locations
- **Define crisp exit criteria** before starting
- Run **lint, build, deploy checks** after every change
- **Verify backend-frontend integration** consistency
- Use **browser console logs and puppeteer** for validation
- **Iterate until zero errors** remain

### Test-Driven Development (Mandatory)

#### TDD Workflow

- Write **comprehensive tests BEFORE** implementing components
- **Create/update test files** before writing component code
- Write component code to **satisfy tests and requirements**
- **Do NOT modify tests** to match failing code
- **Ensure all tests pass** before proceeding

#### Test Categories and Execution

- Use **`test-results.md`** to track all test types and execution
- Execute tests **systematically**, logging results and issues
- **Fix issues one by one**, updating test results
- Mark tests done **only when fully passing**
- **Re-run tests after fixes** to verify resolution

### Enhanced Code Quality Standards

#### TypeScript Strict Requirements (Zero Tolerance)

- **NEVER use `any` type** anywhere in non-test code
- **Always identify and use correct specific types**
- Use **`unknown` instead of `any`** when type is truly unknown
- **Explicit return types** for all public functions
- **Strict null checks** and proper error handling

#### Code Organization and Modularity

- **Break large files** into single-responsibility modules
- **Eliminate duplicate implementations**
- **Remove unused code** and imports
- **Make code more readable** and maintainable
- **Follow single source of truth** principle

#### File Enhancement Policy (Strict)

- **Improve existing files** instead of creating alternatives
- **Never create files** with names like `enhanced*`, `*v2`, `*-new`
- **Refactor in place** rather than duplicating
- **Maintain single source of truth** for each feature

### Advanced Validation Requirements

#### Comprehensive Validation (Mandatory)

- Application must **load cleanly in production** environment
- **All features must work** with proper error handling
- **Browser console must show zero errors**
- **All tests must pass** for implemented functionality
- **No regression** in existing functionality

#### Linting and Standards (Zero Tolerance)

- **Resolve ALL lint warnings** across entire codebase
- **Apply linting to complete repository**
- **Enforce highest code quality standards**
- **Do not accept barely-meeting quality bar** results

#### Production Readiness Validation

- Run **`./scripts/deploy.sh production`** successfully
- **Validate all application aspects** end-to-end
- **Ensure UI shows correct components**
- **Verify all features available** to users
- **Confirm operational condition**

### Enhanced Feature Requirements

#### Dynamic UI Enhancements

- **Update asset charts** to show dynamic min/max Y-axis bounds for better visibility
- **Implement smooth animations** and transitions
- **Add micro-interactions** and feedback

#### API Key Management

- **Allow configuration of multiple API keys** per external source
- **On rate-limit, automatically fall back** to the next key in the list
- **Implement runtime API key rotation**

#### Comprehensive Test Suite

- **Build unit, backend API, front-end, and UI element tests** (curl/wget + browser API)
- **Bucket tests by feature** (core, asset graph, news, dashboard, etc.)
- **Run the full suite** after each change

### Safety and Error Handling (Critical)

#### Command Safety

- **Add timeouts** to commands that may hang
- **Never bypass contingent authorization**
- **Use proper error handling** and recovery
- **Document failed commands** and alternatives in project context

#### Root Cause Analysis

- **Do not create sample, simple, or workaround versions**
- **Analyze issues thoroughly** to identify all causes
- **Resolve issues at root** with minimal side effects
- **Ensure no functionality regression**

### Documentation and Traceability (Mandatory)

#### Design Documentation

- **Document any changes** that differ from design
- **Update design document** with current application state
- **Maintain up-to-date snapshot** of architecture
- **Track deviations and decisions** made during implementation

#### Project Context Maintenance

- **Record failed commands** and working alternatives
- **Track temporary/debug/test files** and purposes
- **Document reusable validation scripts**
- **Maintain known issues** and solutions

### Implementation Guidelines (Critical)

#### Functional First Approach

- **Focus on making things work functionally first**
- **Over-engineer for sophistication** after functionality complete
- **Prioritize working features** over perfect architecture initially
- **Refine and optimize** once core functionality proven

#### Modular Architecture

- **Create tightly coupled models** for compile-time error catching
- **Ensure code correctness** can be verified at build time
- **Avoid runtime failures** through strong typing
- **Implement proper validation** at boundaries

#### Clean-up and Maintenance

- **Remove, clean up, and refactor** unused components
- **Ensure linting applied** to whole codebase
- **Fix all errors and warnings** during linting
- **Maintain clean, organized** codebase

### Task Execution Workflow (Mandatory Steps)

#### Before Starting Any Task

1. **Check if task context file exists** - load and resume from checkpoint
2. **Perform comprehensive code analysis** - identify exact locations needing fixes
3. **Define clear exit criteria** - for task and each sub-step
4. **Run initial validation** - ensure starting state is clean

#### During Task Execution

1. **Update context file** after every significant step
2. **Run tests continuously** - after each change
3. **Validate integration** - backend-frontend consistency
4. **Check browser console** - ensure no errors
5. **Iterate until clean** - zero errors policy

#### After Task Completion

1. **Run full test suite** - all categories
2. **Execute production deployment** - `./scripts/deploy.sh production`
3. **Validate end-to-end** - all features working
4. **Update documentation** - design and context files
5. **Clean working directory** - commit all changes

## Port Configuration and Service Endpoints

### Default Ports

- **Frontend (Vite Dev Server)**: `5173` (default)
- **Backend (Express Server)**: `3001` (configurable via `PORT` env var)
- **Redis Cache**: `6379` (configurable via `REDIS_PORT` env var)
- **WebSocket**: Same as backend server port (`3001`)

### Environment Configuration

```bash
# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3001/api

# Backend (server/.env or environment variables)
PORT=3001                           # Server port
NODE_ENV=development               # Environment mode
DATABASE_URL=sqlite:./data/marketpulse.db
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:5173
```

### API Endpoints

#### System Routes (`/api/system`)

- `GET /api/system/health` - Health check endpoint
- `GET /api/system/info` - System information
- `GET /api/system/metrics` - System metrics

#### Asset Routes (`/api/assets`)

- `GET /api/assets` - Get assets (search, symbols, or popular)
- `GET /api/assets/:symbol` - Get specific asset
- `GET /api/assets/:symbol/price` - Get real-time price
- `GET /api/assets/:symbol/history` - Get price history
- `POST /api/assets/watchlist` - Get multiple assets for watchlist
- `DELETE /api/assets/cache` - Clear all asset cache (admin)
- `DELETE /api/assets/:symbol/cache` - Clear cache for specific symbol (admin)

#### Dashboard Routes (`/api/dashboards`)

- `GET /api/dashboards` - Get user's dashboards
- `GET /api/dashboards/default` - Get default dashboards (public)
- `GET /api/dashboards/public` - Get public dashboards (public)
- `GET /api/dashboards/:id` - Get specific dashboard
- `POST /api/dashboards` - Create new dashboard
- `PUT /api/dashboards/:id` - Update dashboard
- `DELETE /api/dashboards/:id` - Delete dashboard
- `POST /api/dashboards/:id/clone` - Clone dashboard
- `POST /api/dashboards/:id/share` - Create share token
- `GET /api/dashboards/:id/share` - Get share tokens
- `DELETE /api/dashboards/:id/share/:tokenId` - Revoke share token
- `POST /api/dashboards/:id/permissions` - Grant user permission
- `GET /api/dashboards/:id/permissions` - Get user permissions
- `DELETE /api/dashboards/:id/permissions/:userId` - Revoke user permission
- `GET /api/dashboards/:id/embed` - Get embed code

#### News Routes (`/api/news`)

- `GET /api/news` - Get aggregated news with filtering
- `GET /api/news/trending` - Get trending news topics
- `GET /api/news/analysis` - Get market analysis
- `GET /api/news/:symbol` - Get news for specific symbol
- `DELETE /api/news/cache` - Clear all news cache (admin)
- `DELETE /api/news/:symbol/cache` - Clear cache for specific symbol (admin)

#### Additional Routes

- `GET /api/health` - Health check (alias)
- `GET /api/cache/*` - Cache management endpoints
- `GET /api/logs/*` - Logging endpoints
- `GET /api/shared/*` - Shared resource endpoints

### NPM Scripts Reference

#### Root Package Scripts

```bash
# Development
npm run dev                        # Start Vite frontend dev server
npm run build                      # TypeScript compile + Vite build
npm run preview                    # Preview production build

# Code Quality
npm run lint                       # ESLint with zero warnings policy
npm run lint:fix                   # Auto-fix ESLint issues
npm run format                     # Prettier formatting
npm run format:check               # Check Prettier formatting
npm run type-check                 # TypeScript validation (no emit)

# Testing
npm test                          # Run frontend + backend tests
npm run test:frontend             # Frontend tests only (Vitest)
npm run test:backend              # Backend tests only (Jest)
npm run test:run                  # Run tests once (no watch)
npm run test:coverage             # Coverage report
npm run test:integration          # Integration tests
npm run test:e2e                  # Playwright end-to-end tests
npm run test:e2e:ui               # Playwright with UI
npm run test:websocket            # WebSocket integration tests
npm run test:accessibility        # Accessibility tests
npm run test:performance          # Performance tests

# Git Hooks
npm run prepare                   # Setup Husky git hooks
```

#### Server Package Scripts

```bash
# Development (run from server/ directory)
npm run dev                       # Nodemon with TypeScript
npm run build                     # TypeScript compilation
npm run start                     # Start compiled server

# Testing
npm test                         # Jest test suite
npm run test:watch               # Jest in watch mode
npm run test:coverage            # Jest with coverage
npm run test:integration         # Integration tests only

# Code Quality
npm run lint                     # ESLint for server
npm run lint:fix                 # Auto-fix server ESLint
npm run type-check               # TypeScript validation

# Database
npm run migrate                  # Run database migrations
npm run migrate:status           # Check migration status
npm run migrate:validate         # Validate migrations
```

### Testing Scripts and Framework

#### Comprehensive Test Suite Scripts

**Main Test Scripts:**

```bash
# Comprehensive test suite (modular framework) - PRIMARY SCRIPT
./scripts/test-all.sh             # Complete test suite with all phases
./scripts/test-phase.sh           # Run individual test phases
./scripts/test-single.sh          # Run individual tests for debugging

# Specialized test scripts (also integrated into main suite)
./scripts/test-accessibility.sh   # Accessibility validation with Playwright
./scripts/test-performance.sh     # Performance benchmarks with Lighthouse
./scripts/test-websocket-integration.sh  # WebSocket functionality tests
./scripts/test-browser-console.sh # Browser console error validation
```

**The script name should be appropriate for the functionality it's used for:**

- `./scripts/test-all.sh` - The primary comprehensive test suite (replaces legacy monolithic script)
- Individual specialized scripts maintained for standalone use and npm script integration

**Test Framework Architecture:**

```bash
scripts/test-framework/
├── config.sh           # Configuration variables and settings
├── utils.sh             # Common utility functions
├── cleanup.sh           # Server and process cleanup
├── test-runner.sh       # Core test execution logic
├── server-manager.sh    # Backend/frontend server management
├── test-phases.sh       # Test phase definitions
└── README.md           # Framework documentation
```

**Test Suite Reorganization Summary:**

- ✅ **Legacy script removed**: Monolithic `test-all.sh` (1221 lines) replaced
- ✅ **Modular framework active**: New `test-all.sh` uses modular architecture (120 lines + framework)
- ✅ **All test types preserved**: Unit, integration, E2E, accessibility, performance, WebSocket, security
- ✅ **Enhanced functionality**: Individual phase execution, single test debugging, better error handling
- ✅ **Specialized scripts maintained**: Available as npm scripts and standalone execution
- ✅ **Documentation updated**: All references point to current framework structure

#### Test Phase Organization

The framework organizes tests into 8 comprehensive phases:

1. **Dependencies and Setup** (`setup`)
   - Frontend and backend dependency installation
   - Environment preparation and validation

2. **Code Quality and Compilation** (`quality`)
   - TypeScript type checking (frontend and backend)
   - ESLint validation with zero warnings policy
   - Prettier code formatting checks

3. **Unit Tests** (`unit-tests`)
   - Frontend unit tests with Vitest
   - Backend unit tests with Jest
   - Coverage reporting for both

4. **Integration Tests** (`integration-tests`)
   - Frontend integration tests
   - Backend API integration tests
   - Cross-service integration validation

5. **Build and Database** (`build-database`)
   - Production builds (frontend and backend)
   - Database migrations and validation
   - Build artifact verification

6. **End-to-End Tests** (`e2e-tests`)
   - Playwright E2E tests on production build
   - Accessibility tests (WCAG-AA compliance)
   - Performance tests with Lighthouse
   - Browser console error validation

7. **Security and Final Checks** (`security-checks`)
   - NPM security audits (frontend and backend)
   - Package lock validation
   - Configuration validation

8. **Log Validation** (`log-validation`)
   - Test execution log verification
   - Error log analysis
   - Test result compilation

#### Test Script Usage Examples

**Comprehensive Testing:**

```bash
# Run all tests with default settings
./scripts/test-all.sh

# Run with fail-fast mode (stop on first failure)
./scripts/test-all.sh --fail-fast

# Run in non-interactive mode (no user prompts)
./scripts/test-all.sh --non-interactive

# Show help and options
./scripts/test-all.sh --help
```

**Phase-Specific Testing:**

```bash
# Run only setup phase
./scripts/test-phase.sh setup

# Run only unit tests
./scripts/test-phase.sh unit-tests

# Run E2E tests
./scripts/test-phase.sh e2e-tests

# List all available phases
./scripts/test-phase.sh --list
```

**Individual Test Debugging:**

```bash
# Run a single test
./scripts/test-single.sh "Frontend Build" "npm run build"

# Run with category
./scripts/test-single.sh "Backend Tests" "cd server && npm test" "Unit Tests"

# Run with verbose output
./scripts/test-single.sh --verbose "Type Check" "npm run type-check"
```

**Specialized Testing:**

```bash
# Accessibility testing (starts servers automatically)
./scripts/test-accessibility.sh

# Performance testing (starts servers automatically)
./scripts/test-performance.sh

# WebSocket integration testing
./scripts/test-websocket-integration.sh

# Browser console error checking
./scripts/test-browser-console.sh

# Note: All specialized tests are also integrated into the main test suite
# Run ./scripts/test-all.sh to execute all tests including these
```

#### Test Framework Features

**Interactive Mode:**

- Prompts user on test failures with options to continue, stop, or view logs
- Fail-fast mode available for immediate stopping on first failure
- Non-interactive mode for CI/CD environments

**Rolling Log Display:**

- Real-time test output with rolling logs
- Progress indicators for long-running tests
- Contextual error information on failures

**Server Management:**

- Automatic backend and frontend server startup for E2E tests
- Proper cleanup of processes and ports on exit or interruption
- Health checks and timeout handling

**Comprehensive Cleanup:**

- Signal handling for graceful shutdown (Ctrl+C)
- Automatic cleanup of servers, processes, and resources
- Port cleanup to prevent conflicts

**Test Result Tracking:**

- Detailed results saved to `test-results.md`
- Individual test logs in `logs/` directory
- Coverage reports and error analysis
- Execution time tracking

#### Environment Variables for Testing

```bash
# Test behavior control
FAIL_FAST=true           # Exit immediately on first test failure
INTERACTIVE=false        # Run in non-interactive mode (no user prompts)
NODE_ENV=test           # Set Node.js environment to test
VITEST=true             # Enable Vitest-specific configurations

# Server configuration
BACKEND_PORT=3001       # Backend server port
FRONTEND_PORT=4173      # Frontend preview server port
PLAYWRIGHT_BASE_URL=http://localhost:4173  # Playwright test URL

# Timeout settings
SERVER_START_TIMEOUT=90     # Server startup timeout (seconds)
TEST_COMMAND_TIMEOUT=300    # Individual test timeout (seconds)
USER_INPUT_TIMEOUT=30       # User input timeout (seconds)
```

#### Deployment Scripts (`./scripts/`)

```bash
./scripts/deploy.sh development   # Development deployment
./scripts/deploy.sh staging       # Staging deployment
./scripts/deploy.sh production    # Production deployment with validation
```

### Development Workflow Commands

#### Quick Start

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
npm run dev

# Terminal 3: Tests (optional)
npm run test:watch
```

#### Full Development Cycle

```bash
npm install                       # Install all dependencies
npm run type-check               # Validate TypeScript
npm run lint                     # Check code quality
npm test                         # Run test suite
npm run build                    # Build for production
./scripts/deploy.sh production   # Deploy with validation
```

#### Testing Workflow

```bash
npm run test:frontend            # Unit tests
npm run test:backend             # API tests
npm run test:integration         # Integration tests
npm run test:e2e                 # End-to-end tests
npm run test:accessibility       # WCAG compliance
npm run test:performance         # Performance benchmarks
```

### Service URLs in Development

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health
- **WebSocket**: ws://localhost:3001
- **Playwright Tests**: http://localhost:5173 (configurable via `PLAYWRIGHT_BASE_URL`)

### Production Configuration

- Frontend build output: `dist/` directory
- Backend compiled output: `server/dist/` directory
- Database: SQLite file at `./data/marketpulse.db`
- Cache: Redis (with memory fallback)
- Logs: Winston structured logging

**These enhanced guidelines are mandatory and apply to every interaction with the agent. Follow them systematically to ensure high-quality, maintainable, and production-ready code.**
