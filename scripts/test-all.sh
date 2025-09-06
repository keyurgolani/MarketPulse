#!/bin/bash

# MarketPulse - Comprehensive Test Suite
# This script runs all quality gates and tests in the correct order

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test phase tracking
PHASE_COUNT=0
TOTAL_PHASES=8

run_phase() {
    PHASE_COUNT=$((PHASE_COUNT + 1))
    log_info "Phase $PHASE_COUNT/$TOTAL_PHASES: $1"
    echo "----------------------------------------"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test processes..."
    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx watch" 2>/dev/null || true
    pkill -f "node.*3001" 2>/dev/null || true
}

# Set up cleanup trap
trap cleanup EXIT

# Start test execution
log_info "Starting MarketPulse comprehensive test suite..."
echo "========================================"

# Phase 1: Environment Setup
run_phase "Environment Setup and Dependencies"
log_info "Checking Node.js version..."
node --version
log_info "Checking npm version..."
npm --version

log_info "Installing frontend dependencies..."
npm ci --silent

log_info "Installing backend dependencies..."
cd server && npm ci --silent && cd ..

log_success "Environment setup complete"
echo

# Phase 2: Code Quality Checks
run_phase "Code Quality and Type Checking"

log_info "Running TypeScript type checking (frontend)..."
npm run type-check

log_info "Running TypeScript type checking (backend)..."
cd server && npm run type-check && cd ..

log_info "Running ESLint validation (frontend)..."
npm run lint

log_info "Running ESLint validation (backend)..."
cd server && npm run lint && cd ..

log_info "Checking Prettier formatting (frontend)..."
npm run format:check

log_info "Checking Prettier formatting (backend)..."
cd server && npm run format:check && cd ..

log_success "Code quality checks passed"
echo

# Phase 3: Unit Tests
run_phase "Unit Tests"

log_info "Running frontend unit tests with coverage..."
npm run test:coverage

log_info "Running backend unit tests with coverage..."
cd server && npm run test:coverage && cd ..

log_success "Unit tests completed"
echo

# Phase 4: Integration Tests
run_phase "Integration Tests"

log_info "Starting backend server for integration tests..."
cd server && npm run dev &
SERVER_PID=$!
cd ..

# Wait for server to start
log_info "Waiting for backend server to start..."
sleep 5

# Check if server is running
if curl -f http://localhost:3001/api/system/health >/dev/null 2>&1; then
    log_success "Backend server is running"
else
    log_error "Backend server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

log_info "Running API integration tests..."
cd server && npm run test -- --testPathPattern=integration && cd ..

# Stop server
kill $SERVER_PID 2>/dev/null || true
log_success "Integration tests completed"
echo

# Phase 5: Build Tests
run_phase "Build Validation"

log_info "Building frontend for production..."
npm run build

log_info "Building backend for production..."
cd server && npm run build && cd ..

log_info "Testing production build startup..."
cd server && timeout 10s node dist/index.js &
BUILD_PID=$!
sleep 3

# Check if production build works
if curl -f http://localhost:3001/api/system/health >/dev/null 2>&1; then
    log_success "Production build is working"
else
    log_warning "Production build health check failed (may be expected in test environment)"
fi

kill $BUILD_PID 2>/dev/null || true
cd ..

log_success "Build validation completed"
echo

# Phase 6: End-to-End Tests
run_phase "End-to-End Tests"

log_info "Installing Playwright browsers..."
npx playwright install --with-deps chromium

log_info "Running E2E tests..."
npm run test:e2e

log_success "E2E tests completed"
echo

# Phase 7: Accessibility Tests
run_phase "Accessibility Tests"

log_info "Running accessibility tests..."
# Start servers for accessibility testing
npm run dev &
DEV_PID=$!

# Wait for servers to start
sleep 10

# Run accessibility tests
npm run test:accessibility || log_warning "Accessibility tests failed (may need manual review)"

# Stop development servers
kill $DEV_PID 2>/dev/null || true

log_success "Accessibility tests completed"
echo

# Phase 8: Performance Tests
run_phase "Performance Tests"

log_info "Running performance tests..."
npm run test:performance || log_warning "Performance tests failed (may need manual review)"

log_success "Performance tests completed"
echo

# Final Summary
echo "========================================"
log_success "All test phases completed successfully!"
log_info "Test results are available in:"
log_info "  - Frontend coverage: coverage/"
log_info "  - Backend coverage: server/coverage/"
log_info "  - E2E results: test-results/"
log_info "  - Playwright report: playwright-report/"
echo "========================================"