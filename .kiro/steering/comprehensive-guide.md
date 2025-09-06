---
inclusion: always
---

---
inclusion: always
---

# MarketPulse Development Guide

## Product Overview

MarketPulse is a financial dashboard platform with owner-configured defaults and custom user watchlists. Features real-time market data from Yahoo/Google Finance, WebSocket updates, news integration, and WCAG-AA accessibility.

## Technology Stack

**Frontend:** React 19 + TypeScript 5.x + Vite, Zustand (state), React Query (server state), Tailwind CSS + Headless UI, Chart.js, Framer Motion
**Backend:** Node.js 18+ + Express.js + TypeScript, SQLite + Redis, Zod validation, Winston logging, WebSocket (Socket.IO)
**Testing:** Vitest (frontend), Jest (backend), Playwright (E2E), Lighthouse (performance), Axe (accessibility)

## Quick Setup

```bash
# Install dependencies
npm ci && cd server && npm ci && cd ..

# Environment setup
cp server/.env.example server/.env
# Edit server/.env with API keys and configuration

# Database setup
cd server && npm run migrate && cd ..

# Start development
npm run dev  # Frontend (5173) + Backend (3001)

# Verify setup
curl http://localhost:3001/api/system/health
```

## Project Structure

```
src/                    # Frontend React application
├── components/         # React components (ui/, widgets/, layout/, forms/)
├── hooks/             # Custom React hooks (useMarketData, useWebSocket)
├── services/          # API services (marketData, news, auth)
├── stores/            # Zustand state management
├── types/             # TypeScript type definitions
└── utils/             # Utility functions and validation

server/src/            # Backend Express.js application
├── controllers/       # Request handlers (dashboard, asset, news)
├── models/           # Database models (User, Dashboard, Asset)
├── services/         # Business logic (DataAggregation, Cache, RateLimit)
├── middleware/       # Express middleware (auth, validation, errorHandler)
├── routes/           # API routes (dashboards, assets, system)
├── config/           # Configuration (database, cache, apiKeys)
└── websocket/        # WebSocket handlers and events

tests/                # Test files (e2e/, integration/, accessibility/, performance/)
scripts/              # Build and deployment scripts
```

## Code Standards & Quality Gates

### Zero-Error Policy (Mandatory)
- **TypeScript**: Zero errors, strict mode enabled, NEVER use `any` type
- **ESLint**: Zero warnings, accessibility rules enforced
- **Prettier**: Auto-formatted code (pre-commit hooks)
- **Tests**: 80% coverage minimum, all tests must pass
- **Build**: Production build must succeed
- **Browser Console**: Zero errors/warnings

### Naming Conventions
- Components: `PascalCase` (`AssetWidget.tsx`)
- Hooks: `camelCase` with 'use' prefix (`useMarketData.ts`)
- Services: `camelCase` (`marketDataService.ts`)
- Types: `PascalCase` (`MarketData.ts`)
- Constants: `UPPER_SNAKE_CASE`

### Code Patterns
- **Single responsibility** per file/function/component
- **Explicit return types** for all public functions
- **Zod validation** for all API inputs
- **Error boundaries** for React components
- **Proper HTTP status codes** for API responses

## Architecture Patterns

### Path Aliases (Configured in vite.config.ts & tsconfig.app.json)
```typescript
import { Button } from '@/components/ui/Button';
import { useMarketData } from '@/hooks/useMarketData';
import { marketDataService } from '@/services/marketDataService';
import { userStore } from '@/stores/userStore';
import { Asset } from '@/types/Asset';
```

### Component Pattern (Required)
```typescript
interface AssetWidgetProps {
  symbol: string;
  refreshInterval?: number;
}

export const AssetWidget: React.FC<AssetWidgetProps> = ({ 
  symbol, 
  refreshInterval = 30000 
}): React.JSX.Element => {
  const { data, error, isLoading } = useMarketData(symbol, refreshInterval);
  
  if (error) return <ErrorBoundary error={error} />;
  if (isLoading) return <SkeletonLoader />;
  
  return (
    <div className="asset-widget" data-testid="asset-widget">
      {/* Implementation */}
    </div>
  );
};
```

### API Response Format (Standardized)
```typescript
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: number;
  metadata?: { page?: number; limit?: number; total?: number; };
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
- **Single source of truth** for each feature

### MarketPulse-Specific Rules
- **Data Sources**: Yahoo Finance (primary), Google Finance (fallback)
- **Caching**: Redis → Memory cache fallback
- **Rate Limiting**: Auto API key rotation on 429 responses
- **UI**: WCAG-AA compliance, mobile-first responsive design
- **Performance**: Lazy loading, virtualization for large datasets

## Development Workflow

### Slice-by-Slice Implementation (Mandatory)
Build complete end-to-end features incrementally. Each slice must be fully tested and production-ready before commit.

### TDD Process (Required)
1. **Types first** - Define TypeScript interfaces
2. **Tests** - Write comprehensive tests BEFORE implementation
3. **Implement** - Build complete end-to-end functionality
4. **Validate** - Run full test suite and quality checks
5. **Regression Test** - Ensure existing functionality works
6. **Commit** - Only when all quality gates pass

### Quality Gates (Before ANY Commit)
```bash
npm run type-check    # ZERO TypeScript errors
npm run lint         # ZERO ESLint warnings
npm run format:check # Proper formatting
npm test            # ALL tests passing
npm run build       # Successful production build
# Browser console: ZERO errors/warnings
# Manual testing: Feature works end-to-end
# Regression testing: No broken functionality
```

### Git Commit Standards
```bash
feat: add real-time price updates for dashboard widgets
fix: resolve chart rendering issue on mobile devices
refactor: extract market data logic into reusable service
test: add unit tests for dashboard configuration
```

## Essential Commands

### Development
```bash
npm run dev                    # Start both frontend (5173) and backend (3001)
npm run dev:client             # Frontend only
cd server && npm run dev       # Backend only

npm run type-check             # TypeScript validation (zero errors)
npm run lint                   # ESLint validation (zero warnings)
npm run lint:fix               # Auto-fix ESLint issues
npm run format                 # Prettier formatting
npm run format:check           # Check formatting
```

### Testing
```bash
./scripts/test-all.sh          # Complete test suite
npm test                       # Frontend unit tests (Vitest)
cd server && npm test          # Backend tests (Jest)
npm run test:e2e               # End-to-end tests (Playwright)
npm run test:accessibility     # WCAG-AA compliance
npm run test:performance       # Performance tests (Lighthouse)
```

### Build & Deploy
```bash
npm run build                  # Frontend production build
cd server && npm run build     # Backend build
cd server && npm run migrate   # Database migrations
./scripts/deploy.sh production # Full deployment with validation
```

## Implementation Guidelines

### TypeScript Requirements
- **Strict mode enabled** - No implicit any, strict null checks
- **NEVER use `any` type** - Use specific types or `unknown`
- **Explicit return types** for all public functions
- **Interfaces over types** for object shapes

### React Best Practices
- **Functional components** with hooks only
- **Custom hooks** for reusable logic
- **Error boundaries** for component trees
- **WCAG-AA accessibility** - ARIA labels, semantic HTML

### Backend Standards
- **Zod validation** for all inputs
- **Centralized error handling** with proper HTTP status codes
- **Async/await** over promises
- **Winston structured logging**

### Performance & Security
- **Code splitting** with dynamic imports
- **Lazy loading** for heavy components
- **Multi-level caching** strategies
- **Input sanitization** and rate limiting

## Task Execution Guidelines

### Context Management
- **Create/update** `<task_name>.md` in `.kiro/specs/market-pulse/context/`
- **Record**: objective, context gathered, changes made
- **Load existing context** at task start and resume from checkpoint

### Execution Rules
- Begin with **thorough code analysis** to identify exact locations
- **Define clear exit criteria** before starting
- Run **lint, build, deploy checks** after every change
- **Verify backend-frontend integration** consistency
- **Iterate until zero errors** remain

### Test-Driven Development (Mandatory)
- Write **comprehensive tests BEFORE** implementing components
- **Create/update test files** before writing component code
- **Do NOT modify tests** to match failing code
- **Ensure all tests pass** before proceeding

### Production Readiness Validation
- Run **`./scripts/deploy.sh production`** successfully
- **Application must load cleanly** in production
- **Browser console must show zero errors**
- **All tests must pass** for implemented functionality
- **No regression** in existing functionality

## Current Implementation Status

### ✅ Completed Features
- **Frontend Core**: React 19, TypeScript, Tailwind CSS foundation
- **Dashboard System**: Owner-configured defaults, custom user dashboards
- **Widget Framework**: Asset, news, chart widgets with drag-and-drop
- **Data Visualization**: Chart.js integration, responsive charts
- **Real-time Integration**: WebSocket connections, live market data
- **News Integration**: Multi-source aggregation, sentiment analysis
- **User Management**: Authentication, preferences, theme switching
- **Performance**: Caching strategies, code splitting, virtualization
- **Accessibility**: WCAG-AA compliance, keyboard navigation
- **UI Polish**: Framer Motion animations, loading states

### 🔄 In Progress
- **Testing & QA**: Comprehensive test suite (633+ tests)
- **Production Deployment**: Deployment scripts, monitoring
- **Final Integration**: Code consolidation, quality assurance

## Environment Configuration

### Default Ports & Services
- **Frontend**: `5173` (Vite dev server)
- **Backend**: `3001` (Express API + WebSocket)
- **Redis**: `6379` (optional, fallback to memory)
- **Database**: SQLite at `./data/marketpulse.db`

### Environment Variables

**Backend (server/.env) - Required:**
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=./data/marketpulse.db
CORS_ORIGIN=http://localhost:5173

# Optional Redis (fallback to memory)
REDIS_URL=redis://localhost:6379

# External API Keys (for full functionality)
YAHOO_FINANCE_API_KEY=your_key_here
GOOGLE_FINANCE_API_KEY=your_key_here
NEWS_API_KEY=your_key_here

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here
```

**Frontend (.env) - Optional:**
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
VITE_ENABLE_DEBUG=true
```

### API Endpoints
```bash
# System
GET /api/system/health
GET /api/system/info

# Assets
GET /api/assets
GET /api/assets/:symbol
GET /api/assets/:symbol/price
POST /api/assets/watchlist

# Dashboards
GET /api/dashboards
GET /api/dashboards/:id
POST /api/dashboards
PUT /api/dashboards/:id

# News
GET /api/news
GET /api/news/:symbol

# WebSocket
WS /ws/market-data
WS /ws/news
```

## Test Framework

### Test Execution
```bash
./scripts/test-all.sh              # Complete test suite
./scripts/test-phase.sh <phase>    # Individual phases
./scripts/test-single.sh <test>    # Single test debugging
```

### Test Phases
1. **setup** - Dependencies and environment
2. **quality** - TypeScript, ESLint, Prettier
3. **unit-tests** - Frontend and backend unit tests
4. **integration-tests** - API integration
5. **build-database** - Production builds
6. **e2e-tests** - End-to-end workflows
7. **security-checks** - Security audits
8. **log-validation** - Test verification

### Coverage Requirements
- **80% minimum** for branches, functions, lines, statements
- **10 second timeout** for tests and hooks
- **Zero errors** required for all test phases

## Quick Reference

### Development URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/system/health
- **WebSocket**: ws://localhost:3001

### Key Commands
```bash
npm run dev                    # Start frontend + backend
npm run type-check             # TypeScript validation
npm run lint                   # ESLint (zero warnings)
npm run build                  # Production build
npm test                       # All tests
./scripts/test-all.sh          # Comprehensive test suite
./scripts/deploy.sh production # Deploy with validation
```

### Key Directories
- **Frontend**: `src/` (components, hooks, services, stores, types)
- **Backend**: `server/src/` (controllers, models, services, middleware, routes)
- **Tests**: `tests/` (e2e, accessibility, performance, integration)
- **Scripts**: `scripts/test-framework/` (modular test architecture)
