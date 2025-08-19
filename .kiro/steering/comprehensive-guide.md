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

**These guidelines are mandatory and apply to every interaction with the agent. Follow them systematically to ensure high-quality, maintainable, and production-ready code.**
