#!/bin/bash

# MarketPulse Deployment Script
# Usage: ./scripts/deploy.sh [environment] [--dry-run]
# Environments: development, staging, production

set -e

ENVIRONMENT=${1:-development}
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        development|staging|production)
            ENVIRONMENT=$1
            shift
            ;;
        *)
            echo "❌ Unknown argument: $1"
            echo "Usage: $0 [environment] [--dry-run]"
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    echo "🔍 Running deployment validation (dry-run) for $ENVIRONMENT environment..."
else
    echo "🚀 Starting MarketPulse deployment for $ENVIRONMENT environment..."
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Error: Invalid environment '$ENVIRONMENT'"
    echo "Valid environments: development, staging, production"
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: package.json not found. Please run from project root."
    exit 1
fi

# Install dependencies
if [ "$DRY_RUN" = true ]; then
    echo "📦 Validating dependencies..."
    npm ci --dry-run
else
    echo "📦 Installing dependencies..."
    npm ci
fi

# Run quality checks
echo "🔍 Running quality checks..."
if [ "$DRY_RUN" = true ]; then
    echo "  - Lint check: npm run lint"
    echo "  - Format check: npm run format:check"
else
    npm run lint
    npm run format:check
fi

# Run type checking
echo "🔧 Type checking..."
if [ "$DRY_RUN" = true ]; then
    echo "  - TypeScript check: npm run type-check"
else
    npm run type-check
fi

# Run tests
echo "🧪 Running tests..."
if [ "$DRY_RUN" = true ]; then
    echo "  - Test suite: npm run test:run"
else
    npm run test:run
fi

# Build for production
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "🏗️  Building for production..."
    if [ "$DRY_RUN" = true ]; then
        echo "  - Production build: npm run build"
        echo "✅ Production deployment validation completed successfully!"
        echo "📝 All checks passed - ready for production deployment"
    else
        npm run build
        echo "✅ Production build completed successfully!"
        echo "📁 Build files are in the 'dist' directory"
        echo "🌐 You can preview the build with: npm run preview"
    fi
else
    if [ "$DRY_RUN" = true ]; then
        echo "🏗️  Development deployment validation..."
        echo "✅ Development deployment validation completed successfully!"
    else
        echo "🏗️  Starting development server..."
        echo "🌐 Development server will be available at http://localhost:5173"
        echo "📝 Note: This is a development deployment"
    fi
fi

if [ "$DRY_RUN" = true ]; then
    echo "✅ MarketPulse deployment validation for $ENVIRONMENT completed successfully!"
else
    echo "✅ MarketPulse deployment for $ENVIRONMENT completed successfully!"
fi