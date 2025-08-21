import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveDashboard } from '../useResponsiveDashboard';

// Mock window properties
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// Mock matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock navigator.maxTouchPoints
Object.defineProperty(navigator, 'maxTouchPoints', {
  writable: true,
  configurable: true,
  value: 0,
});

describe('useResponsiveDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset window dimensions
    window.innerWidth = 1024;
    window.innerHeight = 768;

    // Default matchMedia mock
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query === '(hover: hover)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useResponsiveDashboard());

    expect(result.current.currentBreakpoint).toBe('desktop');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.screenWidth).toBe(1024);
    expect(result.current.screenHeight).toBe(768);
  });

  it('should detect mobile screen size', () => {
    window.innerWidth = 375;
    window.innerHeight = 667;

    const { result } = renderHook(() => useResponsiveDashboard());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.currentBreakpoint).toBe('mobile');
    expect(result.current.screenWidth).toBe(375);
  });

  it('should detect tablet screen size', () => {
    window.innerWidth = 768;
    window.innerHeight = 1024;

    const { result } = renderHook(() => useResponsiveDashboard());

    expect(result.current.isTablet).toBe(true);
    expect(result.current.currentBreakpoint).toBe('tablet');
    expect(result.current.screenWidth).toBe(768);
  });

  it('should provide optimal widget size calculation', () => {
    const { result } = renderHook(() => useResponsiveDashboard());

    expect(typeof result.current.getOptimalWidgetSize).toBe('function');

    const chartSize = result.current.getOptimalWidgetSize('chart');
    expect(chartSize).toHaveProperty('width');
    expect(chartSize).toHaveProperty('height');
    expect(chartSize.width).toBeGreaterThan(0);
    expect(chartSize.height).toBeGreaterThan(0);
  });

  it('should handle window resize', () => {
    const { result } = renderHook(() => useResponsiveDashboard());

    act(() => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.screenWidth).toBe(375);
  });

  it('should provide responsive utilities', () => {
    const { result } = renderHook(() => useResponsiveDashboard());

    expect(typeof result.current.shouldShowSidebar).toBe('function');
    expect(typeof result.current.shouldCollapseTabs).toBe('function');
    expect(typeof result.current.getMaxVisibleTabs).toBe('function');

    // Desktop should show sidebar
    expect(result.current.shouldShowSidebar()).toBe(true);
    expect(result.current.shouldCollapseTabs()).toBe(false);
    expect(result.current.getMaxVisibleTabs()).toBe(6);
  });

  it('should handle touch device detection', () => {
    const { result } = renderHook(() => useResponsiveDashboard());

    expect(typeof result.current.isTouchDevice).toBe('boolean');
    expect(typeof result.current.supportsHover).toBe('boolean');
  });

  it('should provide zoom and pan controls', () => {
    const { result } = renderHook(() => useResponsiveDashboard());

    expect(typeof result.current.zoomIn).toBe('function');
    expect(typeof result.current.zoomOut).toBe('function');
    expect(typeof result.current.resetZoom).toBe('function');
    expect(typeof result.current.panTo).toBe('function');

    // Test that functions can be called without error
    act(() => {
      result.current.zoomIn();
      result.current.zoomOut();
      result.current.resetZoom();
      result.current.panTo(100, 100);
    });
  });
});
