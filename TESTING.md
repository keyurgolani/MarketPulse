# MarketPulse Testing Guide

## Test Targets

MarketPulse provides multiple test targets to suit different development needs:

### Standard Tests (offline by default) ⚡

```bash
npm test                    # Frontend unit tests
npm run test:server         # Backend unit tests
npm run test:all            # Both frontend and backend (offline)
npm run test:comprehensive  # Full test suite (offline) - RECOMMENDED
```

### Offline Tests (no external API calls) ⚡

```bash
npm run test:offline                    # Frontend unit tests (offline)
npm run test:server:offline             # Backend unit tests (offline)
npm run test:all:offline                # Both frontend and backend (offline)
```

### Tests with External API Calls ⚠️

```bash
npm run test:comprehensive:with-external-apis  # Full test suite including external API calls
```

## Why Offline Tests by Default?

**The comprehensive test suite now uses offline tests by default to prevent:**

- Rate limiting from external services (Alpha Vantage, Twelve Data, Finnhub)
- Network dependency issues during development
- Slower test execution
- API quota consumption during frequent testing

**Perfect for:**

- Development workflow (default)
- CI/CD pipelines
- Frequent test runs
- Code quality checks

## What Gets Skipped in Offline Mode?

- `server/src/__tests__/integration/externalApis.integration.test.ts` - Real API integration tests
- Any tests that make actual HTTP calls to external services

**All other tests run normally:**

- Unit tests with mocked external calls
- Internal API integration tests
- Database tests
- Authentication tests
- UI component tests

## Quick Commands

```bash
# Fast development testing (recommended - offline by default)
npm run test:comprehensive

# Individual offline tests
npm run test:all:offline

# When you need to test external API integration
npm run test:comprehensive:with-external-apis
```

## Test Scripts Location

- **Offline comprehensive tests (default)**: `./scripts/test-all.sh`
- **Tests with external APIs**: `./scripts/test-with-external-apis.sh`

## Coverage

Offline tests may show slightly lower coverage percentages since external API integration tests are excluded. This is expected and doesn't indicate missing test coverage for your application logic.
