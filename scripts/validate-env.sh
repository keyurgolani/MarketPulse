#!/bin/bash

# MarketPulse - Environment Validation Script
# Validates that the development environment is properly configured

set -e

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

# Validation functions
check_node_version() {
    log_info "Checking Node.js version..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        return 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_NODE="18.0.0"
    
    if ! npx semver -r ">=$REQUIRED_NODE" "$NODE_VERSION" >/dev/null 2>&1; then
        log_error "Node.js version $NODE_VERSION is below required $REQUIRED_NODE"
        return 1
    fi
    
    log_success "Node.js version $NODE_VERSION is compatible"
}

check_npm_version() {
    log_info "Checking npm version..."
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        return 1
    fi
    
    NPM_VERSION=$(npm --version)
    REQUIRED_NPM="9.0.0"
    
    if ! npx semver -r ">=$REQUIRED_NPM" "$NPM_VERSION" >/dev/null 2>&1; then
        log_error "npm version $NPM_VERSION is below required $REQUIRED_NPM"
        return 1
    fi
    
    log_success "npm version $NPM_VERSION is compatible"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check frontend dependencies
    if [ ! -d "node_modules" ]; then
        log_warning "Frontend dependencies not installed. Run: npm install"
        return 1
    fi
    
    # Check backend dependencies
    if [ ! -d "server/node_modules" ]; then
        log_warning "Backend dependencies not installed. Run: cd server && npm install"
        return 1
    fi
    
    log_success "Dependencies are installed"
}

check_environment_files() {
    log_info "Checking environment configuration..."
    
    # Check backend .env file
    if [ ! -f "server/.env" ]; then
        log_warning "Backend .env file not found. Copy from server/.env.example"
        if [ -f "server/.env.example" ]; then
            log_info "Example file available at server/.env.example"
        fi
        return 1
    fi
    
    # Check required environment variables
    if ! grep -q "JWT_SECRET" server/.env; then
        log_warning "JWT_SECRET not configured in server/.env"
    fi
    
    if ! grep -q "DATABASE_URL" server/.env; then
        log_warning "DATABASE_URL not configured in server/.env"
    fi
    
    log_success "Environment files are configured"
}

check_database() {
    log_info "Checking database setup..."
    
    # Check if database file exists
    if [ ! -f "server/data/marketpulse.db" ]; then
        log_warning "Database not initialized. Run: cd server && npm run migrate"
        return 1
    fi
    
    log_success "Database is initialized"
}

check_ports() {
    log_info "Checking port availability..."
    
    # Check if ports are available
    if lsof -i :5173 >/dev/null 2>&1; then
        log_warning "Port 5173 (frontend) is already in use"
    else
        log_success "Port 5173 (frontend) is available"
    fi
    
    if lsof -i :3001 >/dev/null 2>&1; then
        log_warning "Port 3001 (backend) is already in use"
    else
        log_success "Port 3001 (backend) is available"
    fi
}

check_git_hooks() {
    log_info "Checking Git hooks..."
    
    if [ ! -f ".husky/pre-commit" ]; then
        log_warning "Pre-commit hooks not installed. Run: npx husky install"
        return 1
    fi
    
    if [ ! -x ".husky/pre-commit" ]; then
        log_warning "Pre-commit hook is not executable"
        chmod +x .husky/pre-commit
    fi
    
    log_success "Git hooks are configured"
}

check_build_tools() {
    log_info "Checking build tools..."
    
    # Check TypeScript
    if ! npx tsc --version >/dev/null 2>&1; then
        log_error "TypeScript compiler not available"
        return 1
    fi
    
    # Check ESLint
    if ! npx eslint --version >/dev/null 2>&1; then
        log_error "ESLint not available"
        return 1
    fi
    
    # Check Prettier
    if ! npx prettier --version >/dev/null 2>&1; then
        log_error "Prettier not available"
        return 1
    fi
    
    log_success "Build tools are available"
}

test_basic_functionality() {
    log_info "Testing basic functionality..."
    
    # Test TypeScript compilation
    log_info "Testing TypeScript compilation..."
    npm run type-check >/dev/null 2>&1 || {
        log_error "TypeScript compilation failed"
        return 1
    }
    
    cd server && npm run type-check >/dev/null 2>&1 || {
        log_error "Backend TypeScript compilation failed"
        cd ..
        return 1
    }
    cd ..
    
    # Test linting
    log_info "Testing ESLint..."
    npm run lint >/dev/null 2>&1 || {
        log_warning "ESLint found issues (run 'npm run lint:fix' to auto-fix)"
    }
    
    log_success "Basic functionality tests passed"
}

# Main validation function
main() {
    log_info "Starting MarketPulse environment validation..."
    echo "========================================"
    
    VALIDATION_ERRORS=0
    
    check_node_version || VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    check_npm_version || VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    check_dependencies || VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    check_environment_files || VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    check_database || VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    check_ports
    check_git_hooks || VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    check_build_tools || VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    
    if [ $VALIDATION_ERRORS -eq 0 ]; then
        test_basic_functionality || VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
    fi
    
    echo "========================================"
    
    if [ $VALIDATION_ERRORS -eq 0 ]; then
        log_success "Environment validation completed successfully!"
        log_info "You can now run:"
        log_info "  npm run dev          # Start development servers"
        log_info "  npm test            # Run tests"
        log_info "  ./scripts/test-all.sh # Run comprehensive test suite"
        log_info "  ./scripts/deploy.sh  # Deploy application"
    else
        log_error "Environment validation failed with $VALIDATION_ERRORS error(s)"
        log_info "Please fix the issues above and run validation again"
        exit 1
    fi
}

# Run validation
main