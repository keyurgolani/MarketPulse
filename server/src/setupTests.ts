import { cleanupGlobalCacheService } from './services/CacheService';

// Set test timeout
jest.setTimeout(10000);

// Global cleanup after each test
afterEach(async () => {
  // Clear all timers
  jest.clearAllTimers();

  // Clear all mocks
  jest.clearAllMocks();
});

// Global cleanup after all tests
afterAll(async () => {
  try {
    await cleanupGlobalCacheService();
  } catch {
    // Ignore cleanup errors in tests
  }

  // Clear any remaining timers
  jest.clearAllTimers();

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Give time for cleanup
  await new Promise((resolve) => setTimeout(resolve, 200));
});
