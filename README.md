# MarketPulse

A comprehensive financial dashboard platform with real-time market data, customizable watchlists, and advanced analytics. Built with modern web technologies and designed for performance, accessibility, and scalability.

## 🚀 Features

- **Real-time Market Data** - Live price updates via WebSocket connections
- **Custom Dashboards** - User-configurable dashboards with drag-and-drop widgets
- **Multi-source Data** - Aggregated data from Yahoo Finance and Google Finance with fallback
- **Accessibility First** - WCAG-AA compliant with full keyboard navigation
- **Dark/Light Themes** - Responsive design with smooth theme transitions
- **Performance Optimized** - Aggressive caching, lazy loading, and code splitting

## 🛠️ Technology Stack

### Frontend

- **React 18** + **TypeScript 5.x** + **Vite** - Modern development stack
- **Zustand** - Lightweight state management
- **React Query** - Server state management with caching
- **Tailwind CSS** + **Headless UI** - Utility-first styling with accessible components
- **Chart.js** + **Recharts** - Interactive data visualization

### Backend

- **Node.js 18+** + **Express.js** + **TypeScript** - Server framework
- **SQLite** + **Redis** - Database and caching (Redis fallback to memory)
- **Socket.io** - Real-time WebSocket communication
- **Zod** - Runtime type validation
- **Winston** - Structured logging

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Git** for version control

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd marketpulse
npm install
cd server && npm install && cd ..
```

### 2. Environment Setup

```bash
# Copy environment templates
cp .env.example .env
cp server/.env.example server/.env

# Edit configuration as needed
```

### 3. Database Setup

```bash
# Run database migrations
cd server && npm run migrate && cd ..
```

### 4. Development

```bash
# Start both frontend and backend
npm run dev

# Or start individually:
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to see the application.

## 🧪 Testing

MarketPulse includes a comprehensive test suite with multiple testing strategies:

### Complete Test Suite

```bash
# Run all tests (recommended)
./scripts/test-all.sh

# Run with fail-fast mode (stop on first failure)
./scripts/test-all.sh --fail-fast

# Run in non-interactive mode (for CI/CD)
./scripts/test-all.sh --non-interactive
```

### Individual Test Phases

```bash
# Run specific test phases
./scripts/test-phase.sh setup              # Dependencies and setup
./scripts/test-phase.sh quality            # Code quality and compilation
./scripts/test-phase.sh unit-tests         # Unit tests
./scripts/test-phase.sh integration-tests  # Integration tests
./scripts/test-phase.sh build-database     # Build and database
./scripts/test-phase.sh e2e-tests          # End-to-end tests
./scripts/test-phase.sh security-checks    # Security and validation
./scripts/test-phase.sh log-validation     # Log validation

# List all available phases
./scripts/test-phase.sh --list
```

### Specialized Testing

```bash
# Individual test types (also included in main suite)
npm run test:frontend        # Frontend unit tests
npm run test:backend         # Backend unit tests
npm run test:integration     # Integration tests
npm run test:e2e            # End-to-end tests
npm run test:accessibility  # Accessibility tests
npm run test:performance    # Performance tests
npm run test:websocket      # WebSocket functionality
```

### Test Categories

The test suite includes 8 comprehensive phases:

1. **Dependencies and Setup** - Install dependencies and prepare environment
2. **Code Quality and Compilation** - TypeScript checks, linting, formatting
3. **Unit Tests** - Frontend and backend unit tests with coverage
4. **Integration Tests** - Integration tests including WebSocket functionality
5. **Build and Database** - Production builds and database operations
6. **End-to-End Tests** - E2E, accessibility, and performance tests on production build
7. **Security and Final Checks** - Security audits and validation
8. **Log Validation** - Verify test execution and system logs

## 🏗️ Build and Deploy

### Production Build

```bash
# Build both frontend and backend
npm run build

# Or build individually:
npm run build              # Frontend
cd server && npm run build # Backend
```

### Deployment

```bash
# Deploy to production with validation
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to development
./scripts/deploy.sh development
```

## 📊 Development Commands

### Code Quality

```bash
npm run lint              # Check code quality
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting
npm run type-check        # TypeScript validation
```

### Database Operations

```bash
cd server
npm run migrate           # Run database migrations
npm run migrate:status    # Check migration status
npm run migrate:validate  # Validate migrations
```

### Testing and Coverage

```bash
npm test                  # Run all tests
npm run test:coverage     # Generate coverage reports
npm run test:watch        # Run tests in watch mode
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

#### Backend (server/.env)

```bash
PORT=3001
NODE_ENV=development
DATABASE_URL=sqlite:./data/marketpulse.db
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:5173
```

### Ports and Services

- **Frontend (Development)**: http://localhost:5173
- **Frontend (Preview)**: http://localhost:4173
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001
- **Redis Cache**: localhost:6379

## 📁 Project Structure

```
marketpulse/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── stores/            # Zustand state stores
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── server/                # Backend source code
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   └── utils/         # Server utilities
│   └── scripts/           # Database and utility scripts
├── tests/                 # Test files
├── scripts/               # Build and deployment scripts
├── docs/                  # Documentation
└── public/                # Static assets
```

## 🧪 Test Framework

MarketPulse uses a modular test framework with the following components:

- **Main Test Suite**: `./scripts/test-all.sh` - Comprehensive test execution
- **Phase Runner**: `./scripts/test-phase.sh` - Individual test phases
- **Single Test Runner**: `./scripts/test-single.sh` - Debug individual tests
- **Specialized Scripts**: Accessibility, performance, WebSocket, and console tests

### Test Framework Features

- **Rolling Log Display** - Real-time test output with progress indicators
- **Interactive Mode** - User prompts on test failures with options to continue/stop
- **Comprehensive Cleanup** - Automatic cleanup of servers and processes
- **Signal Handling** - Graceful handling of interruptions (Ctrl+C)
- **Detailed Logging** - Individual test logs saved to `logs/` directory
- **Result Tracking** - Test results saved to `test-results.md`

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the coding standards
4. **Run the test suite**: `./scripts/test-all.sh`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript strict mode - no `any` types
- Maintain WCAG-AA accessibility compliance
- Write tests for new functionality
- Use semantic commit messages
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` directory
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Testing**: Run `./scripts/test-all.sh --help` for test suite options
- **Logs**: Check `logs/` directory for detailed error information

## 🎯 Performance

- **Lighthouse Score**: 95+ across all metrics
- **Bundle Size**: Optimized with code splitting and tree shaking
- **Caching Strategy**: Multi-level caching (Redis → Memory → API)
- **Accessibility**: WCAG-AA compliant with full keyboard navigation
- **Real-time Updates**: WebSocket connections with automatic reconnection

---

Built with ❤️ by the MarketPulse Team
