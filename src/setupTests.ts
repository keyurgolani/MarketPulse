import '@testing-library/jest-dom';

// Vitest globals are automatically available when globals: true is set in vitest.config.ts
// This includes: describe, it, expect, vi, beforeEach, afterEach, etc.

// Mock window.matchMedia for theme store tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
