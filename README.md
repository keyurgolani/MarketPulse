# MarketPulse - Financial Dashboard Platform

A comprehensive financial dashboard platform with real-time market data, customizable dashboards, and accessibility-first design.

## Features

- **Real-time market data** - Live price updates from multiple sources
- **Custom dashboards** - User-configurable layouts and widgets
- **WCAG-AA accessibility** - Full keyboard navigation and screen reader support
- **Dark/light themes** - Smooth theme transitions with user preference persistence
- **Responsive design** - Optimized for mobile, tablet, desktop, and ultra-wide screens
- **Multi-source data aggregation** - Yahoo Finance, Google Finance with intelligent fallback

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Vite for fast development and building
- Zustand for state management
- React Query for server state management

### Backend
- Node.js with Express
- SQLite for local data storage
- Redis for caching (with memory fallback)
- TypeScript for type safety

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (frontend)
npm run dev

# Start backend server
npm run dev:server

# Start both frontend and backend
npm run dev:all
```

## Development Commands

```bash
# Development
npm run dev              # Start frontend development server
npm run dev:server       # Start backend development server
npm run dev:all          # Start both frontend and backend

# Building
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage report

# Type Checking
npm run type-check       # Check TypeScript types
```

## Project Structure

```
├── src/                     # Frontend source code
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components
│   │   ├── widgets/        # Dashboard widgets
│   │   └── layout/         # Layout components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   ├── stores/             # State management
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
├── server/                  # Backend source code
│   └── src/                # Server source files
│       ├── controllers/    # Request handlers
│       ├── models/         # Database models
│       ├── services/       # Business logic
│       └── routes/         # API routes
├── tests/                   # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
└── scripts/                # Build and deployment scripts
```

## Contributing

### Code Style Guidelines

- Use TypeScript with strict mode enabled
- Follow ESLint and Prettier configurations
- Write tests for new functionality
- Use conventional commit messages
- Ensure WCAG-AA accessibility compliance

### Development Workflow

1. Create feature branch from main
2. Implement changes with tests
3. Run quality checks: `npm run lint && npm run type-check && npm test`
4. Commit with conventional commit format
5. Create pull request for review

## License

MIT License - see LICENSE file for details