# Task 2: Backend Core Infrastructure and Database Setup

**Context File:** `.kiro/specs/market-pulse/context/2-context.md`
**Objective:** Build robust backend foundation with database, caching, and API infrastructure
**Exit Criteria:** Server starts without errors, database operations work, caching functional, API endpoints respond correctly, tests pass
**Git Commits:** Create commits after each major milestone (server setup, database schema, caching implementation, API endpoints)

## General Guidelines

**Before starting any task:**

1. Check if `.kiro/specs/market-pulse/context/2-context.md` exists
2. If it exists, load context and resume from last checkpoint
3. If not, create the context file with task objective
4. Perform comprehensive code analysis to identify best approach for implementation or potential issue spots
5. Update context file after every sub-step with progress and changes

**During task execution:**

- Update task context file continuously with objective, gathered context, and changes made
- Run linting, compilation, build, and deployment checks after every change
- Use browser console logs and Puppeteer for validation
- Ensure backend-frontend integration symmetry
- Add timeouts to commands that might hang
- Reference project context file for known failing commands and alternatives
- Follow test-driven development: write tests before implementing components
- Break large files into single-responsibility modules
- Remove unused code and refactor for readability
- **Improve existing functionality** instead of creating alternative versions (no `enhanced*`, `*v2`, `improved*` files)
- **Always modify original files** when enhancing functionality to maintain single source of truth
- **Create git commits** at substantial milestones within each task
- Use conventional commit messages (feat:, fix:, refactor:, test:, docs:)

**Task completion criteria:**

- All linting, compilation, build, and deployment errors resolved
- Application loads cleanly in production (`./script/deploy.sh production`)
- All features work including animations and interactions
- Browser console shows no errors
- Tests pass for implemented functionality
- Context file updated with final status
- No regression in existing functionality
- **Git commit created** with descriptive message following conventional commit format
- Working directory clean and changes properly versioned

**Testing validation requirements:**

- **test-results.md updated** - All test outcomes documented with issues and fixes
- **Systematic test execution** - Run all applicable test categories for the task
- **Issue resolution** - All identified problems fixed and marked complete
- **Zero-error completion** - No test marked done until fully passing
- **Regression testing** - Verify existing functionality still works after changes

**Validation methodology:**

- **test-results.md tracking** - Document all testing progress and outcomes
- **Systematic test execution** - Run applicable tests from 11 test categories
- **Issue-driven development** - Log all problems, fix systematically, mark complete
- Use browser console logs and Puppeteer scripts as primary validation
- Run full test suite after each change
- Validate end-to-end application behavior
- Check responsive design across all device types
- Verify accessibility compliance
- **Zero-error policy** - No task complete until all tests pass

## Subtasks

### 2.1 Initialize Express.js server with TypeScript configuration

**Context File:** `.kiro/specs/market-pulse/context/2.1-context.md`
**Exit Criteria:** Server starts without errors, health endpoint responds, TypeScript compiles, tests pass

#### 2.1.1 Set up backend project structure and dependencies

**Files to create:** `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`
**Commands:** `cd server && npm init -y`, `npm install express cors helmet morgan winston`, `npm install -D @types/express @types/cors @types/node typescript nodemon ts-node`
**Detailed Implementation:**

- Create backend directory structure: `src/controllers/`, `src/models/`, `src/services/`, `src/middleware/`, `src/routes/`, `src/config/`, `src/utils/`
- Configure TypeScript for Node.js with strict mode and ES modules
- Set up package.json scripts: `dev`, `build`, `start`, `test`

**Validation:** TypeScript compiles without errors, dependencies installed correctly
**Commit:** `feat: initialize backend project structure with TypeScript`

#### 2.1.2 Create Express server with security middleware

**Files to create:** `server/src/app.ts`, `server/src/middleware/security.ts`, `server/src/middleware/errorHandler.ts`
**Detailed Implementation:**

- Configure Express with CORS, Helmet, Morgan logging, and JSON parsing
- Implement security middleware with rate limiting and request validation
- Set up global error handling middleware with proper HTTP status codes
- Configure CORS for development and production environments

**Validation:** Server starts without errors, security headers present in responses
**Commit:** `feat: configure Express server with security middleware`

#### 2.1.3 Implement environment configuration and validation

**Files to create:** `server/src/config/environment.ts`, `server/src/config/database.ts`, `server/.env.example`
**Detailed Implementation:**

- Use Zod for environment variable validation and type safety
- Configure different settings for development, test, and production environments
- Implement configuration loading with fallback values and validation
- Document all required environment variables

**Validation:** Configuration loads correctly, validation catches missing variables
**Commit:** `feat: implement type-safe environment configuration`

#### 2.1.4 Create health check and system endpoints

**Files to create:** `server/src/routes/system.ts`, `server/src/controllers/systemController.ts`
**Detailed Implementation:**

- Implement `/api/system/health` endpoint with database and cache status
- Add `/api/system/info` endpoint with version and environment information
- Create `/api/system/metrics` endpoint for basic performance metrics
- Implement proper error handling and timeout management

**Validation:** Health endpoints respond correctly, curl/wget tests pass
**Commit:** `feat: implement system health check and monitoring endpoints`

#### 2.1.5 Set up logging and monitoring infrastructure

**Files to create:** `server/src/utils/logger.ts`, `server/src/middleware/requestLogger.ts`
**Detailed Implementation:**

- Configure Winston logger with multiple transports (console, file)
- Implement structured logging with request correlation IDs
- Set up request/response logging middleware
- Configure log levels and rotation for production

**Validation:** Logs generated correctly, structured format maintained
**Commit:** `feat: configure structured logging and request monitoring`

#### 2.1.6 Write comprehensive server tests

**Files to create:** `server/src/__tests__/app.test.ts`, `server/src/__tests__/system.test.ts`
**Commands:** `npm install -D jest supertest @types/jest @types/supertest`
**Detailed Implementation:**

- Create unit tests for server initialization and configuration
- Write integration tests for health check endpoints
- Test error handling and middleware functionality
- Configure Jest for Node.js testing environment

**Validation:** All tests pass, coverage reports generated
**Commit:** `test: add comprehensive server and endpoint tests`

**Requirements:** 3.1, 4.1

### 2.2 Implement SQLite database schema and connection management

**Context File:** `.kiro/specs/market-pulse/context/2.2-context.md`
**Exit Criteria:** Database connects successfully, migrations run, CRUD operations work, tests pass

#### 2.2.1 Set up SQLite database connection and configuration

**Files to create:** `server/src/config/database.ts`, `server/src/utils/database.ts`
**Commands:** `npm install sqlite3 better-sqlite3`, `npm install -D @types/sqlite3`
**Detailed Implementation:**

- Configure SQLite database connection with connection pooling
- Implement database initialization and connection management
- Set up database file location and backup strategies
- Configure database settings for development and production

**Validation:** Database connection established, file created correctly
**Commit:** `feat: configure SQLite database connection and management`

#### 2.2.2 Design and create database schema

**Files to create:** `server/migrations/001_initial_schema.sql`, `server/src/models/schema.ts`
**Detailed Implementation:**

- Design tables: `users`, `dashboards`, `widgets`, `assets`, `news_articles`, `cache_metadata`
- Create foreign key relationships and constraints
- Define indexes for performance optimization
- Document table structures and relationships

**Validation:** Schema creates without errors, relationships enforced
**Commit:** `feat: design and implement database schema with relationships`

#### 2.2.3 Implement database migration system

**Files to create:** `server/src/utils/migrations.ts`, `server/scripts/migrate.ts`
**Detailed Implementation:**

- Create migration runner with version tracking
- Implement up/down migration support
- Add migration validation and rollback capabilities
- Create migration scripts for schema updates

**Validation:** Migrations run successfully, version tracking works
**Commit:** `feat: implement database migration system with versioning`

#### 2.2.4 Create database models and ORM layer

**Files to create:** `server/src/models/User.ts`, `server/src/models/Dashboard.ts`, `server/src/models/Widget.ts`, `server/src/models/Asset.ts`
**Detailed Implementation:**

- Implement model classes with TypeScript interfaces
- Create CRUD operations for all entities
- Add data validation and sanitization
- Implement query builders and relationship handling

**Validation:** Models work correctly, CRUD operations tested
**Commit:** `feat: implement database models with CRUD operations`

#### 2.2.5 Add database error handling and logging

**Files to create:** `server/src/middleware/databaseErrorHandler.ts`, `server/src/utils/databaseLogger.ts`
**Detailed Implementation:**

- Implement comprehensive error handling for database operations
- Add query logging and performance monitoring
- Create database health checks and connection monitoring
- Implement transaction management and rollback handling

**Validation:** Error handling works correctly, logs generated properly
**Commit:** `feat: add database error handling and monitoring`

#### 2.2.6 Write database integration tests

**Files to create:** `server/src/__tests__/database.test.ts`, `server/src/__tests__/models.test.ts`
**Detailed Implementation:**

- Create tests for database connection and initialization
- Write tests for all CRUD operations and model methods
- Test migration system and schema validation
- Create test fixtures and data seeding

**Validation:** All database tests pass, test coverage adequate
**Commit:** `test: add comprehensive database and model tests`

**Requirements:** 1.1, 2.1, 2.2

### 2.3 Set up Redis caching layer with fallback to memory cache

**Context File:** `.kiro/specs/market-pulse/context/2.3-context.md`
**Exit Criteria:** Cache service works with Redis and memory fallback, statistics endpoint functional, tests pass

#### 2.3.1 Install and configure Redis connection

**Files to create:** `server/src/config/redis.ts`, `server/src/services/RedisService.ts`
**Commands:** `npm install redis`, `npm install -D @types/redis`
**Detailed Implementation:**

- Configure Redis connection with connection pooling and retry logic
- Implement Redis client initialization and error handling
- Set up Redis configuration for development and production
- Add Redis health checks and connection monitoring

**Validation:** Redis connects successfully, health checks pass
**Commit:** `feat: configure Redis connection with health monitoring`

#### 2.3.2 Implement memory cache fallback system

**Files to create:** `server/src/services/MemoryCacheService.ts`, `server/src/services/CacheService.ts`
**Detailed Implementation:**

- Create in-memory cache implementation with LRU eviction
- Implement automatic fallback when Redis is unavailable
- Add cache statistics and memory usage monitoring
- Create unified cache interface for both Redis and memory cache

**Validation:** Fallback works correctly, memory cache functional
**Commit:** `feat: implement memory cache fallback system`

#### 2.3.3 Create cache service with TTL management

**Files to create:** `server/src/services/CacheManager.ts`, `server/src/utils/cacheUtils.ts`
**Detailed Implementation:**

- Implement cache operations: get, set, delete, exists, expire
- Add TTL management with different expiration strategies
- Create cache key generation and namespace management
- Implement cache invalidation patterns and bulk operations

**Validation:** Cache operations work correctly, TTL enforced properly
**Commit:** `feat: implement cache service with TTL management`

#### 2.3.4 Add cache statistics and monitoring endpoints

**Files to create:** `server/src/controllers/cacheController.ts`, `server/src/routes/cache.ts`
**Detailed Implementation:**

- Create `/api/system/cache-stats` endpoint with hit/miss ratios
- Implement cache performance metrics and monitoring
- Add cache size and memory usage reporting
- Create cache invalidation and refresh endpoints

**Validation:** Statistics endpoints work, metrics accurate
**Commit:** `feat: add cache statistics and monitoring endpoints`

#### 2.3.5 Implement cache warming and background refresh

**Files to create:** `server/src/services/CacheWarmingService.ts`, `server/src/utils/backgroundTasks.ts`
**Detailed Implementation:**

- Create cache warming strategies for frequently accessed data
- Implement background refresh for expiring cache entries
- Add cache preloading for critical application data
- Create cache refresh scheduling and management

**Validation:** Cache warming works, background refresh functional
**Commit:** `feat: implement cache warming and background refresh`

#### 2.3.6 Write comprehensive cache tests

**Files to create:** `server/src/__tests__/cache.test.ts`, `server/src/__tests__/cacheService.test.ts`
**Detailed Implementation:**

- Create tests for Redis and memory cache operations
- Test fallback mechanisms and error handling
- Write tests for TTL management and expiration
- Test cache statistics and monitoring functionality

**Validation:** All cache tests pass, fallback behavior verified
**Commit:** `test: add comprehensive cache service tests`

**Requirements:** 4.1, 4.2, 4.3

## Requirements Coverage

- 3.1: Backend API foundation
- 4.1: Caching infrastructure
- 1.1, 2.1, 2.2: Database and data management
- 4.2, 4.3: Performance optimization

## Project Context File

Maintain `.kiro/specs/market-pulse/project-context.md` with:

- Commands that have failed and their working alternatives
- Temporary/debug/test files and their purposes
- Validation scripts that can be reused
- Known issues and their solutions
- Components with duplicate implementations that need consolidation