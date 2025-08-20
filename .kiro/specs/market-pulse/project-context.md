# MarketPulse Project Context

## Project Overview

MarketPulse is a comprehensive financial dashboard platform built with React, TypeScript, and modern web technologies. This file tracks command alternatives, temporary files, and reusable validation scripts as specified in the comprehensive development guidelines.

## Command Alternatives and Known Issues

### Security Vulnerabilities (Non-blocking)

| Package | Version | Issue                            | Impact           | Status                             |
| ------- | ------- | -------------------------------- | ---------------- | ---------------------------------- |
| esbuild | 0.21.5  | Development server vulnerability | Development only | Documented - Production unaffected |
| vite    | 5.4.19  | Depends on vulnerable esbuild    | Development only | Documented - Production unaffected |

**Note:** These vulnerabilities only affect the development server and do not impact production builds. The built application is secure.

### Failed Commands and Working Alternatives

| Failed Command               | Issue                         | Working Alternative                   | Notes                          |
| ---------------------------- | ----------------------------- | ------------------------------------- | ------------------------------ |
| `cd server && npm test`      | cd not allowed in executeBash | `npm test` with `path: "server"`      | Use path parameter instead     |
| `curl http://localhost:5173` | Dev server timeout            | `npm run build && npm run preview`    | Use built version for testing  |
| Direct browser testing       | No headless browser           | Check built files + production deploy | Validate through build process |

### Commands That May Hang (Use Timeouts)

- `npm install` - Use `timeout 60 npm install`
- `npm run build` - Use `timeout 120 npm run build`
- `npm test` - Use `timeout 120 npm test`
- `./scripts/deploy.sh` - Use `timeout 300 ./scripts/deploy.sh`

## Temporary and Debug Files Tracking

### Current Temporary Files

| File/Directory                      | Purpose                 | Status    | Can Delete                      |
| ----------------------------------- | ----------------------- | --------- | ------------------------------- |
| `test-results.md`                   | Test execution tracking | Active    | No - Keep updated               |
| `dist/`                             | Production build output | Generated | Yes - Regenerated on build      |
| `node_modules/`                     | Dependencies            | Managed   | No - Required                   |
| `server/dist/`                      | Backend build output    | Generated | Yes - Regenerated on build      |
| `.kiro/specs/market-pulse/context/` | Task context files      | Active    | No - Required for task tracking |

### Validation Scripts Created

| Script              | Purpose                          | Location       | Reusable                         |
| ------------------- | -------------------------------- | -------------- | -------------------------------- |
| `test-results.md`   | Comprehensive test tracking      | Root directory | Yes - Update for new test cycles |
| `scripts/deploy.sh` | Production deployment validation | `scripts/`     | Yes - Full deployment pipeline   |

## Reusable Validation Patterns

### Test Execution Pattern

```bash
# 1. Check existing test status
cat test-results.md

# 2. Execute test with timeout
timeout 60 npm run [test-command]

# 3. Update test-results.md with results
# 4. Fix issues if any
# 5. Re-run until passing
```

### Build Validation Pattern

```bash
# 1. Type check
timeout 60 npm run type-check

# 2. Lint check
timeout 60 npm run lint

# 3. Build
timeout 120 npm run build

# 4. Test
timeout 120 npm test
```

### Production Deployment Pattern

```bash
# Full validation pipeline
timeout 300 ./scripts/deploy.sh production
```

## Strict TypeScript Guidelines

All code in this project must follow strict TypeScript guidelines:

- **Never use `any` type** - Always identify and use the correct specific type
- **Use `unknown` instead of `any`** - When the type is truly unknown, use `unknown` and add type guards
- **Explicit return types** - All functions must have explicit return types
- **Strict null checks** - Handle null and undefined cases explicitly
- **Generic constraints** - Use extends for type safety in generics
- **Type guards** - Implement proper type guards for runtime type checking

## Working Commands

- - [ ] ### Development

- `npm run dev` - Start development servers (frontend + backend)
- `npm run dev:client` - Start frontend development server only
- `npm run build` - Build production application
- `npm run preview` - Preview production build locally

- - [ ] ### Quality Assurance

- `npm run test` - Run unit tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run qa` - Run all quality checks (lint + type + test)

- - [ ] ### Deployment

- `./scripts/deploy.sh production` - Full production deployment with validation
- `./scripts/deploy.sh development` - Development environment setup

## Validation Scripts

- - [ ] ### Deployment Validation

The `scripts/deploy.sh` script provides comprehensive validation:

- Node.js version compatibility check
- Dependency installation verification
- TypeScript type checking
- ESLint code quality checks
- Prettier formatting validation
- Unit test execution
- Production build creation
- Bundle size analysis
- Preview server startup test

- - [ ] ### Browser Validation

- Application loads without console errors
- Theme toggle functionality works
- Responsive design across device sizes
- Accessibility compliance (WCAG-AA)

## Known Working Configuration

- - [ ] ### Technology Stack

- **Frontend**: React 18, TypeScript 5.x, Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state, React Query for server state
- **Testing**: Vitest, React Testing Library, Playwright (E2E)
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks

- - [ ] ### Build Configuration

- Vite with React plugin and TypeScript support
- Path aliases configured for clean imports (@/components, @/hooks, etc.)
- Code splitting with vendor, router, charts, and UI chunks
- PostCSS with Tailwind CSS and Autoprefixer

- - [ ] ### Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components and routing
├── hooks/         # Custom React hooks
├── services/      # API services and external integrations
├── stores/        # Zustand state management
├── utils/         # Utility functions and helpers
├── styles/        # Styling and design system
├── types/         # TypeScript type definitions
└── test/          # Test setup and utilities
```

## Temporary/Debug Files

- `deployment-report-*.txt` - Generated deployment reports (can be cleaned up)
- `dist/` - Production build output (regenerated on each build)
- `node_modules/` - Dependencies (managed by npm)

## Issues and Solutions

- - [ ] ### ESLint TypeScript Version Warning

- **Issue**: TypeScript 5.9.2 not officially supported by @typescript-eslint
- **Status**: Warning only, functionality works correctly
- **Solution**: Consider downgrading TypeScript or upgrading ESLint when newer versions are available

- - [ ] ### CSS Import Order Warning

- **Issue**: @import statements must precede other CSS rules
- **Status**: Fixed by moving font imports to top of globals.css
- **Solution**: Always place @import statements before @tailwind directives

- - [ ] ### Pre-commit Hook Configuration

- **Issue**: commitlint not configured but referenced in Husky
- **Status**: Removed commitlint hook, using lint-staged only
- **Solution**: Pre-commit runs ESLint and Prettier on staged files

## Testing and Validation Framework

- - [ ] ### Systematic Testing Approach

The project follows a comprehensive testing methodology using `test-results.md` to track progress:

1. **test-results.md creation** - Central tracking file for all testing activities
2. **11 test categories** - Comprehensive coverage from structure to production
3. **Step-by-step execution** - Sequential test execution with progress tracking
4. **Issue logging** - All problems documented with fixes and completion status
5. **Zero-error policy** - No test marked complete until fully passing
6. **Regression prevention** - Existing functionality validated after changes

- - [ ] ### Test Categories

1. **Project Structure Tests** - Directory structure and file organization
2. **Package Configuration Tests** - Dependencies and build configuration
3. **Frontend Build Tests** - React/TypeScript compilation and bundling
4. **Backend Build Tests** - Node.js/Express server compilation
5. **Linting Tests** - Code quality and style compliance
6. **TypeScript Compilation Tests** - Type safety verification
7. **Unit Tests** - Comprehensive unit test suite
8. **Development Server Tests** - Local environment validation
9. **Database Tests** - Database connectivity and migrations
10. **API Endpoint Tests** - Backend functionality validation
11. **Production Build Tests** - Deployment readiness verification

- - [ ] ### Testing Workflow

```bash
# 1. Check test status
cat test-results.md

# 2. Execute tests systematically
npm run test
npm run lint
npm run type-check
npm run build
./scripts/deploy.sh production

# 3. Update test-results.md with outcomes
# 4. Fix issues one by one
# 5. Re-run tests until passing
# 6. Mark complete only when zero errors
```

## Enhanced Development Guidelines Implementation

### Task-Level Context Management

- **Context Files**: Each task now has dedicated context files in `.kiro/specs/market-pulse/context/`
- **Resume Capability**: Tasks can be resumed from last checkpoint using context files
- **Continuous Updates**: Context files updated after every significant step
- **Checkpoint System**: Load existing context at task start, create if not exists

### Test-Driven Development Framework

- **test-results.md**: Central tracking for all test categories and execution
- **Systematic Execution**: Tests run one by one with results and issues logged
- **Issue Tracking**: Each test identifies issues, fixes them, marks as resolved
- **Completion Criteria**: Tests marked done only when fully passing
- **TDD Workflow**: Write tests BEFORE implementing components

### Code Quality Standards (Zero Tolerance)

- **No `any` Types**: Strict TypeScript with specific types only
- **Single Responsibility**: Break large files into focused modules
- **Duplicate Elimination**: Remove duplicate implementations, create single source of truth
- **Unused Code Removal**: Clean up all unused imports and components
- **Linting Standards**: Zero warnings across entire codebase

### Enhanced Validation Requirements

- **Production Readiness**: `./scripts/deploy.sh production` must run successfully
- **Browser Console**: Zero errors in production environment
- **Feature Validation**: All features work with proper error handling
- **Integration Consistency**: Backend-frontend integration verified
- **Regression Prevention**: No functionality regression allowed

### Advanced Feature Requirements

- **Dynamic Y-Axis**: Charts show dynamic min/max bounds for better visibility
- **API Key Management**: Multiple keys per source with automatic fallback
- **Real-time Updates**: WebSocket integration with offline handling
- **Comprehensive Testing**: Unit, API, frontend, UI element tests

### Safety and Error Handling

- **Command Timeouts**: All potentially hanging commands have timeouts
- **Root Cause Analysis**: Thorough issue analysis, no workaround solutions
- **Error Recovery**: Proper error handling and recovery mechanisms
- **Documentation**: All changes and deviations documented

## Next Steps for Development

1. **Execute test-results.md systematically** - Complete all test categories with zero errors
2. **Implement Task 2**: Dashboard System with context management
3. **Apply TDD methodology**: Write tests before implementing components
4. **Code quality enforcement**: Zero lint warnings, no `any` types
5. **Production deployment validation**: Ensure clean deployment pipeline
6. **Feature enhancement**: Dynamic charts, API key rotation, real-time updates

## Performance Benchmarks

- **Bundle Size**: ~2MB (acceptable for financial dashboard)
- **Build Time**: ~1.7s for production build
- **Test Execution**: ~1.7s for unit test suite
- **Development Server**: Starts in <3s with HMR

## Security Considerations

- Environment variables properly configured
- API keys will be managed securely (not in repository)
- CORS configuration for production deployment
- Input validation and sanitization planned for all user inputs
