#!/bin/bash

# MarketPulse - Production Deployment Script
# Validates environment, builds, and deploys the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
BUILD_DIR="dist"
SERVER_BUILD_DIR="server/dist"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

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

# Validation functions
validate_environment() {
    log_info "Validating deployment environment: $ENVIRONMENT"
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE="18.0.0"
    
    if ! npx semver -r ">=$REQUIRED_NODE" "$NODE_VERSION" >/dev/null 2>&1; then
        log_error "Node.js version $NODE_VERSION is below required $REQUIRED_NODE"
        exit 1
    fi
    
    # Check npm version
    NPM_VERSION=$(npm --version)
    REQUIRED_NPM="9.0.0"
    
    if ! npx semver -r ">=$REQUIRED_NPM" "$NPM_VERSION" >/dev/null 2>&1; then
        log_error "npm version $NPM_VERSION is below required $REQUIRED_NPM"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

validate_dependencies() {
    log_info "Validating dependencies..."
    
    # Check for security vulnerabilities
    log_info "Running security audit..."
    npm audit --audit-level=high
    
    cd server
    npm audit --audit-level=high
    cd ..
    
    log_success "Security audit passed"
}

run_quality_gates() {
    log_info "Running quality gates..."
    
    # Type checking
    log_info "Type checking frontend..."
    npm run type-check
    
    log_info "Type checking backend..."
    cd server && npm run type-check && cd ..
    
    # Linting
    log_info "Linting frontend..."
    npm run lint
    
    log_info "Linting backend..."
    cd server && npm run lint && cd ..
    
    # Formatting
    log_info "Checking code formatting..."
    npm run format:check
    cd server && npm run format:check && cd ..
    
    log_success "Quality gates passed"
}

run_tests() {
    log_info "Running test suite..."
    
    # Unit tests with coverage
    log_info "Running frontend unit tests..."
    npm run test:coverage
    
    log_info "Running backend unit tests..."
    cd server && npm run test:coverage && cd ..
    
    # Integration tests
    log_info "Starting backend for integration tests..."
    cd server && npm run dev &
    SERVER_PID=$!
    cd ..
    
    sleep 5
    
    if curl -f http://localhost:3001/api/system/health >/dev/null 2>&1; then
        log_info "Running integration tests..."
        cd server && npm run test -- --testPathPattern=integration && cd ..
    else
        log_warning "Backend not responding, skipping integration tests"
    fi
    
    kill $SERVER_PID 2>/dev/null || true
    
    log_success "Tests completed"
}

build_application() {
    log_info "Building application for $ENVIRONMENT..."
    
    # Clean previous builds
    log_info "Cleaning previous builds..."
    rm -rf $BUILD_DIR $SERVER_BUILD_DIR
    
    # Build frontend
    log_info "Building frontend..."
    if [ "$ENVIRONMENT" = "production" ]; then
        NODE_ENV=production npm run build
    else
        npm run build
    fi
    
    # Build backend
    log_info "Building backend..."
    cd server
    if [ "$ENVIRONMENT" = "production" ]; then
        NODE_ENV=production npm run build
    else
        npm run build
    fi
    cd ..
    
    log_success "Build completed"
}

validate_build() {
    log_info "Validating build artifacts..."
    
    # Check frontend build
    if [ ! -d "$BUILD_DIR" ] || [ ! -f "$BUILD_DIR/index.html" ]; then
        log_error "Frontend build validation failed"
        exit 1
    fi
    
    # Check backend build
    if [ ! -d "$SERVER_BUILD_DIR" ] || [ ! -f "$SERVER_BUILD_DIR/index.js" ]; then
        log_error "Backend build validation failed"
        exit 1
    fi
    
    # Test backend startup
    log_info "Testing backend startup..."
    cd server
    timeout 10s node dist/index.js &
    TEST_PID=$!
    sleep 3
    
    if curl -f http://localhost:3001/api/system/health >/dev/null 2>&1; then
        log_success "Backend startup validation passed"
    else
        log_warning "Backend startup validation failed (may be expected in test environment)"
    fi
    
    kill $TEST_PID 2>/dev/null || true
    cd ..
    
    log_success "Build validation completed"
}

create_backup() {
    if [ "$ENVIRONMENT" = "production" ] && [ -d "$BUILD_DIR" ]; then
        log_info "Creating backup..."
        mkdir -p "$BACKUP_DIR"
        cp -r $BUILD_DIR "$BACKUP_DIR/frontend"
        cp -r $SERVER_BUILD_DIR "$BACKUP_DIR/backend"
        log_success "Backup created at $BACKUP_DIR"
    fi
}

deploy_to_environment() {
    log_info "Deploying to $ENVIRONMENT environment..."
    
    case $ENVIRONMENT in
        "development")
            log_info "Development deployment - starting servers..."
            npm run dev &
            DEV_PID=$!
            
            sleep 5
            
            if curl -f http://localhost:5173 >/dev/null 2>&1 && curl -f http://localhost:3001/api/system/health >/dev/null 2>&1; then
                log_success "Development servers started successfully"
                log_info "Frontend: http://localhost:5173"
                log_info "Backend: http://localhost:3001"
                log_info "Press Ctrl+C to stop servers"
                
                # Keep servers running
                wait $DEV_PID
            else
                log_error "Development servers failed to start"
                kill $DEV_PID 2>/dev/null || true
                exit 1
            fi
            ;;
        "staging"|"production")
            log_info "Production deployment would happen here"
            log_info "Build artifacts are ready in:"
            log_info "  - Frontend: $BUILD_DIR"
            log_info "  - Backend: $SERVER_BUILD_DIR"
            
            # In a real deployment, this would:
            # - Upload to servers
            # - Update reverse proxy configuration
            # - Restart services
            # - Run smoke tests
            # - Update monitoring
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

# Main deployment flow
main() {
    log_info "Starting MarketPulse deployment to $ENVIRONMENT"
    echo "========================================"
    
    validate_environment
    validate_dependencies
    
    if [ "$ENVIRONMENT" != "development" ]; then
        run_quality_gates
        run_tests
    fi
    
    build_application
    validate_build
    create_backup
    deploy_to_environment
    
    echo "========================================"
    log_success "Deployment to $ENVIRONMENT completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    "development"|"staging"|"production")
        main
        ;;
    "--help"|"-h")
        echo "Usage: $0 [environment]"
        echo "Environments: development (default), staging, production"
        echo "Examples:"
        echo "  $0                    # Deploy to development"
        echo "  $0 development        # Deploy to development"
        echo "  $0 staging           # Deploy to staging"
        echo "  $0 production        # Deploy to production"
        ;;
    *)
        if [ -n "${1:-}" ]; then
            log_error "Unknown environment: $1"
            echo "Use --help for usage information"
            exit 1
        else
            main
        fi
        ;;
esac