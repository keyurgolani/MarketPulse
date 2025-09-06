#!/bin/bash

# Integration Test Script for External APIs
# This script runs integration tests that actually call external APIs

echo "🧪 MarketPulse External API Integration Tests"
echo "=============================================="
echo ""

# Check if API keys are set
API_KEYS_FOUND=false

if [ ! -z "$ALPHA_VANTAGE_API_KEY" ]; then
    echo "✅ Alpha Vantage API key found"
    API_KEYS_FOUND=true
fi

if [ ! -z "$TWELVE_DATA_API_KEY" ]; then
    echo "✅ Twelve Data API key found"
    API_KEYS_FOUND=true
fi

if [ ! -z "$FINNHUB_API_KEY" ]; then
    echo "✅ Finnhub API key found"
    API_KEYS_FOUND=true
fi

if [ "$API_KEYS_FOUND" = false ]; then
    echo "❌ No API keys found in environment variables"
    echo ""
    echo "To run integration tests, set one or more of these environment variables:"
    echo "  export ALPHA_VANTAGE_API_KEY='your_key_here'"
    echo "  export TWELVE_DATA_API_KEY='your_key_here'"
    echo "  export FINNHUB_API_KEY='your_key_here'"
    echo ""
    echo "💡 Get free API keys from:"
    echo "  - Alpha Vantage: https://www.alphavantage.co/support/#api-key"
    echo "  - Twelve Data: https://twelvedata.com/pricing"
    echo "  - Finnhub: https://finnhub.io/register"
    echo ""
    echo "⚠️  Integration tests will be skipped"
    echo ""
fi

echo ""
echo "🚀 Running integration tests..."
echo ""

# Run the integration tests
npm test -- --testPathPattern="integration" --verbose

echo ""
echo "✅ Integration tests completed"
echo ""
echo "📝 Note: Tests are automatically skipped if API keys are not available"
echo "   This ensures the test suite can run in CI/CD without API keys"