#!/bin/bash

# MarketPulse Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environments: development, staging, production

set -e

ENVIRONMENT=${1:-development}

echo "🚀 Starting MarketPulse deployment for $ENVIRONMENT environment..."

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
echo "📦 Installing dependencies..."
npm ci

# Run quality checks
echo "🔍 Running quality checks..."
npm run lint
npm run format:check

# Run type checking
echo "🔧 Type checking..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm run test:run

# Build for production
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "🏗️  Building for production..."
    npm run build
    
    echo "✅ Production build completed successfully!"
    echo "📁 Build files are in the 'dist' directory"
    echo "🌐 You can preview the build with: npm run preview"
else
    echo "🏗️  Starting development server..."
    echo "🌐 Development server will be available at http://localhost:5173"
    echo "📝 Note: This is a development deployment"
fi

echo "✅ MarketPulse deployment for $ENVIRONMENT completed successfully!"