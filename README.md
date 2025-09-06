# MarketPulse

A comprehensive financial dashboard platform that enables users to monitor real-time market data through owner-configured default dashboards and custom user watchlists. Built with React, TypeScript, and Express.js.

## 🚀 Features

- **Real-time Market Data**: Alpha Vantage (primary) + Twelve Data (secondary) + Finnhub (tertiary) with automatic API key rotation
- **Owner-Configured Defaults**: Platform owners can set default dashboard layouts for new users
- **Custom Dashboards**: Drag-and-drop widget management with responsive grid layouts
- **WebSocket Updates**: Sub-second real-time price updates with automatic reconnection
- **News Integration**: Multi-source news aggregation with sentiment analysis
- **WCAG-AA Accessibility**: Full compliance with accessibility standards
- **Performance Optimized**: Multi-level caching, code splitting, and virtualization
- **Dark/Light Theme**: Smooth theme transitions with user preferences

## 🛠️ Technology Stack

### Frontend

- **React 18** + **TypeScript 5.x** + **Vite**
- **Zustand** (global state) + **React Query** (server state)
- **Tailwind CSS** + **Headless UI** (styling)
- **Chart.js** (data visualization)
- **Framer Motion** (animations)
- **Socket.IO Client** (real-time updates)

### Backend

- **Node.js 18+** + **Express.js** + **TypeScript**
- **SQLite** (database) + **Redis** (caching)
- **Zod** (validation) + **Winston** (logging)
- **Socket.IO** (WebSocket server)
- **JWT** (authentication)

### Testing & Quality

- **Vitest** (frontend testing) + **Jest** (backend testing)
- **Playwright** (E2E testing) + **Axe** (accessibility testing)
- **ESLint** (zero warnings) + **Prettier** (formatting)
- **TypeScript strict mode** (zero errors policy)

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Redis** (optional - fallback to memory cache)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd marketpulse
npm ci
```

### 2. Environment Setup

```bash
# Copy environment templates
cp .env.example .env
cp server/.env.example server/.env

# Edit server/.env with your configuration
# At minimum, set JWT_SECRET and SESSION_SECRET
```

### 3. Start Development

```bash
# Start both frontend (5173) and backend (3001)
npm run dev

# Or start individually
npm run dev:client          # Frontend only
cd server && npm run dev     # Backend only
```

### 4. Verify Setup

```bash
# Check backend health
curl http://localhost:3001/api/system/health

# Frontend should be available at http://localhost:5173
```

## 📁 Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # React components (ui/, widgets/, layout/)
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── server/src/            # Backend Express.js application
│   ├── controllers/       # Request handlers
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   └── config/           # Configuration
├── tests/                # Test files
└── scripts/              # Build and deployment scripts
```

## 🧪 Development Commands

### Quality Checks (Zero-Error Policy)

```bash
npm run type-check         # TypeScript validation (zero errors)
npm run lint              # ESLint validation (zero warnings)
npm run format:check      # Prettier formatting check
npm run build             # Production build validation
```

### Testing

```bash
npm test                  # Frontend unit tests (Vitest)
cd server && npm test     # Backend tests (Jest)
npm run test:e2e          # End-to-end tests (Playwright)
npm run test:accessibility # WCAG-AA compliance tests
npm run test:coverage     # Coverage reports (80% minimum)
```

### Development

```bash
npm run dev               # Start frontend + backend
npm run lint:fix          # Auto-fix ESLint issues
npm run format            # Auto-format with Prettier
npm run clean             # Clean build artifacts
```

## 🔧 Configuration

### Environment Variables

**Backend (server/.env) - Required:**

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=./data/marketpulse.db
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_secure_secret_here
SESSION_SECRET=your_secure_secret_here

# Optional Redis (fallback to memory)
REDIS_URL=redis://localhost:6379

# External API Keys (for full functionality)
YAHOO_FINANCE_API_KEY=your_key_here
GOOGLE_FINANCE_API_KEY=your_key_here
NEWS_API_KEY=your_key_here
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
GET /api/system/health     # Health check
GET /api/system/info       # System information

# Future endpoints (implemented in later tasks)
GET /api/assets           # Market data
GET /api/dashboards       # Dashboard management
GET /api/news            # News aggregation
WS  /ws/market-data      # Real-time updates
```

## 📊 Quality Standards

### Code Quality Gates

- ✅ **TypeScript**: Zero errors, strict mode enabled
- ✅ **ESLint**: Zero warnings, accessibility rules enforced
- ✅ **Prettier**: Auto-formatted code
- ✅ **Tests**: 80% coverage minimum, all tests passing
- ✅ **Build**: Production build must succeed
- ✅ **Console**: Zero browser errors/warnings

### Accessibility (WCAG-AA)

- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Color contrast compliance
- ✅ Focus management
- ✅ Semantic HTML structure

### Performance

- ✅ Code splitting and lazy loading
- ✅ Multi-level caching strategy
- ✅ Virtualization for large datasets
- ✅ Optimized bundle sizes
- ✅ Service worker for offline support

## 🔒 Security

- **Input Validation**: Zod schemas for all API inputs
- **Rate Limiting**: 100 requests per 15 minutes per user
- **CORS Protection**: Configured allowed origins
- **Security Headers**: Helmet.js middleware
- **JWT Authentication**: Secure token-based auth
- **Input Sanitization**: DOMPurify for user content

## 🚀 Deployment

```bash
# Production build
npm run build
cd server && npm run build

# Database setup
cd server && npm run migrate

# Start production server
cd server && npm start
```

## 🤝 Contributing

1. **Follow the zero-error policy**: All TypeScript, ESLint, and tests must pass
2. **Write tests first**: TDD approach with comprehensive coverage
3. **Accessibility first**: Ensure WCAG-AA compliance
4. **Performance matters**: Consider impact on bundle size and runtime performance
5. **Document changes**: Update README and inline documentation

### Git Commit Standards

```bash
feat: add real-time price updates for dashboard widgets
fix: resolve chart rendering issue on mobile devices
refactor: extract market data logic into reusable service
test: add unit tests for dashboard configuration
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Development**: Follow the slice-by-slice implementation approach

---

**Status**: ✅ Project structure and build configuration completed
**Next**: Implement database setup and core models (Task 2)
