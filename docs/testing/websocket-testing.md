# WebSocket Testing Strategy

This document explains the comprehensive WebSocket testing approach in MarketPulse, addressing the different types of tests and when to use each.

## Test Types Overview

### 1. Unit Tests (Mocked WebSocket)

**Location**: `src/hooks/__tests__/useWebSocket.test.ts`
**Purpose**: Test React hook logic without actual network connections
**When to run**: During development and CI/CD pipeline
**Backend required**: No

```bash
npm run test:frontend
```

**What it tests**:

- Hook state management
- Event handler registration
- Error handling logic
- Component integration
- Mock service interactions

**Why WebSocket errors are expected**: Unit tests mock the WebSocket service, so they don't establish real connections. Any "connection failed" errors in unit tests are expected and indicate proper error handling.

### 2. Integration Tests (Real WebSocket)

**Location**:

- `src/integration/websocket.integration.test.ts` (Vitest)
- `tests/integration/websocket.integration.test.ts` (Playwright)

**Purpose**: Test actual WebSocket functionality with running servers
**When to run**: Before deployment, during integration testing
**Backend required**: Yes (localhost:3001)

```bash
# Run with Vitest (requires backend running)
npm run test:integration

# Run with Playwright (starts servers automatically)
npm run test:websocket

# Run standalone script (comprehensive)
./scripts/test-websocket-integration.sh
```

**What it tests**:

- Real WebSocket connections
- Server-client communication
- Room joining/leaving
- Message broadcasting
- Connection error handling
- Multi-client scenarios

### 3. End-to-End Tests (Browser WebSocket)

**Location**: `tests/e2e/` (Playwright)
**Purpose**: Test WebSocket functionality in actual browser environment
**When to run**: Full system testing
**Backend required**: Yes

```bash
npm run test:e2e
```

**What it tests**:

- Browser WebSocket API compatibility
- Frontend-backend integration
- Real user scenarios
- Cross-browser compatibility

## Test Execution Scenarios

### Scenario 1: Development (Unit Tests Only)

```bash
npm run test:frontend
```

- ✅ Fast execution
- ✅ No server dependencies
- ❌ WebSocket connection errors expected (mocked)
- ❌ No real network validation

### Scenario 2: Integration Testing (With Backend)

```bash
# Start backend first
cd server && npm run dev

# Then run integration tests
npm run test:integration
```

- ✅ Real WebSocket connections
- ✅ Validates actual functionality
- ❌ Requires running backend
- ❌ Slower execution

### Scenario 3: Full System Testing

```bash
npm run test:websocket
```

- ✅ Comprehensive testing
- ✅ Automatic server management
- ✅ Multiple test approaches
- ❌ Longest execution time

## Understanding WebSocket Test Results

### Expected Unit Test Behavior

```
❌ WebSocket connection failed: connect ECONNREFUSED ::1:3001
```

This is **EXPECTED** in unit tests because:

- WebSocket service is mocked
- No real server connection is attempted
- Tests focus on hook logic, not network connectivity

### Expected Integration Test Behavior

```
✅ WebSocket connected successfully
✅ Dashboard room operations working
✅ Message broadcasting functional
```

This indicates **REAL** WebSocket functionality is working.

### Troubleshooting Integration Test Failures

#### Backend Not Running

```
❌ Backend server not accessible, skipping WebSocket integration test
```

**Solution**: Start the backend server:

```bash
cd server && npm run dev
```

#### WebSocket Connection Timeout

```
❌ WebSocket connection timeout
```

**Possible causes**:

- Backend server not fully started
- WebSocket service not initialized
- Port conflicts (3001 already in use)
- Firewall blocking connections

**Solution**:

```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check WebSocket endpoint
curl http://localhost:3001/socket.io/?EIO=4&transport=polling

# Kill any processes on port 3001
lsof -ti:3001 | xargs kill -9
```

#### Room Operations Failing

```
❌ Dashboard room operations failed
```

**Possible causes**:

- WebSocket server not handling room events
- Event handler registration issues
- Message format mismatches

**Solution**: Check server logs for WebSocket event handling errors.

## Test Configuration

### Vitest Integration Tests

```typescript
// vitest.integration.config.ts
export default defineConfig({
  test: {
    include: ['**/integration/**/*.test.{js,ts,jsx,tsx}'],
    testTimeout: 30000, // Longer timeout for network operations
  },
});
```

### Playwright WebSocket Tests

```typescript
// tests/integration/websocket.integration.test.ts
test.describe('WebSocket Integration Tests', () => {
  // Tests run against production build with real servers
});
```

## Best Practices

### 1. Test Isolation

- Each test should clean up WebSocket connections
- Use unique room/user IDs to avoid conflicts
- Reset server state between tests

### 2. Timeout Handling

- Set appropriate timeouts for network operations
- Handle connection failures gracefully
- Provide clear error messages

### 3. Server Dependencies

- Check server availability before running integration tests
- Provide fallback behavior when servers are unavailable
- Document server requirements clearly

### 4. CI/CD Integration

```yaml
# Example GitHub Actions
- name: Run Unit Tests
  run: npm run test:frontend

- name: Start Backend
  run: cd server && npm run dev &

- name: Wait for Backend
  run: npx wait-on http://localhost:3001/api/health

- name: Run Integration Tests
  run: npm run test:integration
```

## Monitoring WebSocket Health

### Development Monitoring

```bash
# Check WebSocket endpoint
curl -I http://localhost:3001/socket.io/

# Monitor WebSocket connections
netstat -an | grep 3001

# Check server logs
tail -f server/logs/combined.log
```

### Production Monitoring

- Monitor WebSocket connection counts
- Track connection success/failure rates
- Alert on WebSocket service unavailability
- Log WebSocket event patterns

## Summary

The MarketPulse WebSocket testing strategy provides comprehensive coverage:

1. **Unit Tests**: Fast, reliable, mocked - for development workflow
2. **Integration Tests**: Real connections - for functionality validation
3. **E2E Tests**: Browser environment - for user experience validation

**Key Point**: WebSocket connection errors in unit tests are expected and normal. For real WebSocket functionality validation, use integration tests with a running backend server.

Use `npm run test:websocket` for comprehensive WebSocket validation that includes server management and multiple test approaches.
