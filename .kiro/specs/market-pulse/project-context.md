# MarketPulse Project Context

## Project Overview

MarketPulse is a comprehensive financial dashboard platform built with React, TypeScript, and modern web technologies.

## Working Commands

### Development

- `npm run dev` - Start development servers (frontend + backend)
- `npm run dev:client` - Start frontend development server only
- `npm run build` - Build production application
- `npm run preview` - Preview production build locally

### Quality Assurance

- `npm run test` - Run unit tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run qa` - Run all quality checks (lint + type + test)

### Deployment

- `./scripts/deploy.sh production` - Full production deployment with validation
- `./scripts/deploy.sh development` - Development environment setup

## Validation Scripts

### Deployment Validation

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

### Browser Validation

- Application loads without console errors
- Theme toggle functionality works
- Responsive design across device sizes
- Accessibility compliance (WCAG-AA)

## Known Working Configuration

### Technology Stack

- **Frontend**: React 18, TypeScript 5.x, Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand for global state, React Query for server state
- **Testing**: Vitest, React Testing Library, Playwright (E2E)
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks

### Build Configuration

- Vite with React plugin and TypeScript support
- Path aliases configured for clean imports (@/components, @/hooks, etc.)
- Code splitting with vendor, router, charts, and UI chunks
- PostCSS with Tailwind CSS and Autoprefixer

### Project Structure

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

### ESLint TypeScript Version Warning

- **Issue**: TypeScript 5.9.2 not officially supported by @typescript-eslint
- **Status**: Warning only, functionality works correctly
- **Solution**: Consider downgrading TypeScript or upgrading ESLint when newer versions are available

### CSS Import Order Warning

- **Issue**: @import statements must precede other CSS rules
- **Status**: Fixed by moving font imports to top of globals.css
- **Solution**: Always place @import statements before @tailwind directives

### Pre-commit Hook Configuration

- **Issue**: commitlint not configured but referenced in Husky
- **Status**: Removed commitlint hook, using lint-staged only
- **Solution**: Pre-commit runs ESLint and Prettier on staged files

## Testing and Validation Framework

### Systematic Testing Approach

The project follows a comprehensive testing methodology using `test-results.md` to track progress:

1. **test-results.md creation** - Central tracking file for all testing activities
2. **11 test categories** - Comprehensive coverage from structure to production
3. **Step-by-step execution** - Sequential test execution with progress tracking
4. **Issue logging** - All problems documented with fixes and completion status
5. **Zero-error policy** - No test marked complete until fully passing
6. **Regression prevention** - Existing functionality validated after changes

### Test Categories

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

### Testing Workflow

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

## Next Steps for Development

1. **Complete current testing cycle** - Finish all 11 test categories
2. Backend server setup (Task 2)
3. Database configuration with SQLite
4. External API integration setup
5. Real-time data aggregation service
6. Frontend component development

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
