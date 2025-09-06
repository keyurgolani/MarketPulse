# External API Integration Testing

This document explains how to test the MarketPulse external API integrations with real API keys.

## Overview

MarketPulse integrates with three external market data providers:

1. **Alpha Vantage** (Primary) - Comprehensive market data
2. **Twelve Data** (Secondary) - Reliable fallback
3. **Finnhub** (Tertiary) - Company profiles and additional data

## Test Types

### 1. Unit Tests (Always Run)

- **Location**: `src/__tests__/services/external/`
- **What they test**: Error handling, response parsing, failover logic
- **API calls**: Mocked (no real API calls)
- **API keys**: Not required
- **Run with**: `npm test`

### 2. Integration Tests (Optional)

- **Location**: `src/__tests__/integration/`
- **What they test**: Real API connectivity, authentication, response formats
- **API calls**: Real API calls to external services
- **API keys**: Required
- **Run with**: `npm run test:integration`

## Getting API Keys (Free Tiers Available)

### Alpha Vantage

1. Visit: https://www.alphavantage.co/support/#api-key
2. Sign up for free account
3. Get your API key
4. **Free tier**: 25 requests per day, 5 per minute

### Twelve Data

1. Visit: https://twelvedata.com/pricing
2. Sign up for free account
3. Get your API key
4. **Free tier**: 800 requests per day

### Finnhub

1. Visit: https://finnhub.io/register
2. Sign up for free account
3. Get your API key
4. **Free tier**: 60 calls per minute

## Setting Up API Keys

### Option 1: Environment Variables (Recommended)

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export ALPHA_VANTAGE_API_KEY="your_alpha_vantage_key_here"
export TWELVE_DATA_API_KEY="your_twelve_data_key_here"
export FINNHUB_API_KEY="your_finnhub_key_here"

# Reload your shell or run:
source ~/.bashrc  # or ~/.zshrc
```

### Option 2: .env File

```bash
# Create server/.env file (copy from .env.example)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
TWELVE_DATA_API_KEY=your_twelve_data_key_here
FINNHUB_API_KEY=your_finnhub_key_here
```

### Option 3: Temporary (Current Session Only)

```bash
# Set for current terminal session
export ALPHA_VANTAGE_API_KEY="your_key_here"
export TWELVE_DATA_API_KEY="your_key_here"
export FINNHUB_API_KEY="your_key_here"
```

## Running Integration Tests

### Quick Test (Recommended)

```bash
# Run integration tests with your API keys
npm run test:integration
```

### Manual Script

```bash
# Run the integration test script
./scripts/test-integration.sh
```

### With Specific API Key

```bash
# Test only Alpha Vantage
ALPHA_VANTAGE_API_KEY="your_key" npm run test:integration

# Test only Twelve Data
TWELVE_DATA_API_KEY="your_key" npm run test:integration

# Test only Finnhub
FINNHUB_API_KEY="your_key" npm run test:integration
```

## What Integration Tests Verify

### ✅ Real API Connectivity

- Actual HTTP requests to external APIs
- Network connectivity and DNS resolution
- SSL/TLS certificate validation

### ✅ Authentication

- API key validation
- Authentication header formats
- Rate limiting responses

### ✅ Response Formats

- Real API response structure
- Data type validation
- Field availability and naming

### ✅ Provider Failover

- Multiple providers working
- Consistent data formats across providers
- Failover logic with real APIs

### ✅ Rate Limiting

- API key rotation
- Rate limit detection
- Graceful handling of 429 responses

## Expected Integration Test Output

### With API Keys:

```
🧪 MarketPulse External API Integration Tests
==============================================

✅ Alpha Vantage API key found
✅ Twelve Data API key found
✅ Finnhub API key found

🚀 Running integration tests...

✅ Alpha Vantage integration test passed: { symbol: 'AAPL', name: 'Apple Inc.' }
✅ Alpha Vantage price test passed: { symbol: 'AAPL', price: 150.25, change: 1.2 }
✅ Twelve Data integration test passed: { symbol: 'AAPL', name: 'Apple Inc' }
✅ Finnhub integration test passed: { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology' }

✅ Integration tests completed
```

### Without API Keys:

```
⚠️  Skipping integration tests - No API keys provided
   Set ALPHA_VANTAGE_API_KEY, TWELVE_DATA_API_KEY, or FINNHUB_API_KEY to run these tests

💡 Get free API keys from:
  - Alpha Vantage: https://www.alphavantage.co/support/#api-key
  - Twelve Data: https://twelvedata.com/pricing
  - Finnhub: https://finnhub.io/register
```

## CI/CD Considerations

### GitHub Actions / CI Pipeline

```yaml
# In your CI pipeline, integration tests are automatically skipped
# if API keys are not provided as secrets

- name: Run Unit Tests
  run: npm test # Always runs (mocked APIs)

- name: Run Integration Tests
  run: npm run test:integration # Skipped if no API keys
  env:
    ALPHA_VANTAGE_API_KEY: ${{ secrets.ALPHA_VANTAGE_API_KEY }}
    TWELVE_DATA_API_KEY: ${{ secrets.TWELVE_DATA_API_KEY }}
    FINNHUB_API_KEY: ${{ secrets.FINNHUB_API_KEY }}
```

## Development Workflow

### 1. Daily Development

```bash
# Run unit tests (no API keys needed)
npm test
```

### 2. Before Deployment

```bash
# Run integration tests to verify API connectivity
npm run test:integration
```

### 3. Debugging API Issues

```bash
# Test specific provider
ALPHA_VANTAGE_API_KEY="your_key" npm run test:integration -- --testNamePattern="Alpha Vantage"
```

## Troubleshooting

### Common Issues

#### "API key not found"

- Verify environment variable is set: `echo $ALPHA_VANTAGE_API_KEY`
- Check .env file exists and has correct format
- Restart terminal after setting environment variables

#### "Rate limit exceeded"

- Wait for rate limit to reset (varies by provider)
- Use different API key if available
- Check API key quotas on provider dashboard

#### "Network timeout"

- Check internet connectivity
- Verify firewall/proxy settings
- Try different provider

#### "Invalid response format"

- API provider may have changed response format
- Check provider documentation for updates
- Update client code if necessary

## Security Notes

### ⚠️ Never Commit API Keys

- Add `.env` to `.gitignore`
- Use environment variables in production
- Rotate API keys regularly
- Monitor API key usage

### ✅ Best Practices

- Use separate API keys for development/production
- Set up monitoring for API key usage
- Implement proper error handling for expired keys
- Use API key rotation for high-volume applications

## Summary

- **Unit tests**: Always run, no API keys needed
- **Integration tests**: Optional, require API keys
- **Free tiers**: Available for all providers
- **Automatic skipping**: Tests skip gracefully without API keys
- **CI/CD friendly**: Works in pipelines with or without secrets
