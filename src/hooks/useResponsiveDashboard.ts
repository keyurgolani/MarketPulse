/**
 * Responsive Dashboard Hook
 * Handles responsive behavior for dashboard layouts and interactions
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Dashboard,
  LayoutConfig,
  ResponsiveConfig,
} from '@/types/dashboard';

export interface ResponsiveDashboardState {
  // Current breakpoint
  currentBreakpoint: keyof ResponsiveConfig;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isUltrawide: boolean;

  // Screen dimensions
  screenWidth: number;
  screenHeight: number;

  // Layout configuration
  currentLayout: LayoutConfig;

  // Touch and interaction
  isTouchDevice: boolean;
  supportsHover: boolean;

  // Orientation
  isPortrait: boolean;
  isLandscape: boolean;
}

export interface ResponsiveDashboardActions {
  // Layout management
  updateLayoutForBreakpoint: (dashboard: Dashboard) => LayoutConfig;
  getOptimalWidgetSize: (widgetType: string) => {
    width: number;
    height: number;
  };

  // Touch interactions
  handleTouchStart: (event: TouchEvent) => void;
  handleTouchMove: (event: TouchEvent) => void;
  handleTouchEnd: (event: TouchEvent) => void;

  // Zoom and pan
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  panTo: (x: number, y: number) => void;

  // Responsive utilities
  shouldShowSidebar: () => boolean;
  shouldCollapseTabs: () => boolean;
  getMaxVisibleTabs: () => number;
}

export interface ResponsiveDashboardHook
  extends ResponsiveDashboardState,
    ResponsiveDashboardActions {}

// Breakpoint definitions
const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  ultrawide: 1440,
} as const;

export const useResponsiveDashboard = (
  dashboard?: Dashboard
): ResponsiveDashboardHook => {
  // State for screen dimensions and breakpoint
  const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState<number>(window.innerHeight);
  const [, setZoomLevel] = useState<number>(1);
  const [, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Determine current breakpoint name
  const getCurrentBreakpointName = useCallback(
    (width: number): keyof ResponsiveConfig => {
      if (width >= BREAKPOINTS.ultrawide) return 'ultrawide';
      if (width >= BREAKPOINTS.desktop) return 'desktop';
      if (width >= BREAKPOINTS.tablet) return 'tablet';
      return 'mobile';
    },
    []
  );

  const currentBreakpoint = getCurrentBreakpointName(screenWidth);

  // Breakpoint booleans
  const isMobile = currentBreakpoint === 'mobile';
  const isTablet = currentBreakpoint === 'tablet';
  const isDesktop = currentBreakpoint === 'desktop';
  const isUltrawide = currentBreakpoint === 'ultrawide';

  // Device capabilities
  const isTouchDevice =
    'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const supportsHover = window.matchMedia('(hover: hover)').matches;

  // Orientation
  const isPortrait = screenHeight > screenWidth;
  const isLandscape = screenWidth > screenHeight;

  // Current layout configuration
  const currentLayout: LayoutConfig = dashboard?.layout || {
    columns: 12,
    rows: 8,
    gap: 16,
    responsive: {
      mobile: {
        columns: 1,
        rows: 8,
        gap: 8,
        resizable: false,
        draggable: false,
      },
      tablet: {
        columns: 6,
        rows: 8,
        gap: 12,
        resizable: true,
        draggable: true,
      },
      desktop: {
        columns: 12,
        rows: 8,
        gap: 16,
        resizable: true,
        draggable: true,
      },
      ultrawide: {
        columns: 16,
        rows: 8,
        gap: 20,
        resizable: true,
        draggable: true,
      },
    },
    autoArrange: false,
    minWidgetSize: { width: 1, height: 1 },
    maxWidgetSize: { width: 12, height: 8 },
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = (): void => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return (): void => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle orientation change
  useEffect(() => {
    const handleOrientationChange = (): void => {
      // Small delay to ensure dimensions are updated
      setTimeout(() => {
        setScreenWidth(window.innerWidth);
        setScreenHeight(window.innerHeight);
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return (): void =>
      window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  // Layout management
  const updateLayoutForBreakpoint = useCallback(
    (targetDashboard: Dashboard): LayoutConfig => {
      const responsiveConfig =
        targetDashboard.layout.responsive[currentBreakpoint];

      return {
        ...targetDashboard.layout,
        columns: responsiveConfig.columns,
        rows: responsiveConfig.rows,
        gap: responsiveConfig.gap,
      };
    },
    [currentBreakpoint]
  );

  const getOptimalWidgetSize = useCallback(
    (widgetType: string): { width: number; height: number } => {
      const baseSize = { width: 4, height: 3 };

      // Adjust based on widget type
      switch (widgetType) {
        case 'chart':
          return isMobile ? { width: 1, height: 2 } : { width: 6, height: 4 };
        case 'news':
          return isMobile ? { width: 1, height: 3 } : { width: 4, height: 6 };
        case 'asset-list':
          return isMobile ? { width: 1, height: 4 } : { width: 8, height: 4 };
        case 'market-summary':
          return isMobile ? { width: 1, height: 2 } : { width: 12, height: 2 };
        default:
          return isMobile ? { width: 1, height: 2 } : baseSize;
      }
    },
    [isMobile]
  );

  // Touch interaction handlers
  const handleTouchStart = useCallback(
    (event: TouchEvent): void => {
      if (!isTouchDevice) return;

      // Prevent default scrolling on dashboard
      if (
        event.target instanceof Element &&
        event.target.closest('.dashboard-container')
      ) {
        event.preventDefault();
      }
    },
    [isTouchDevice]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent): void => {
      if (!isTouchDevice) return;

      // Handle pan gestures
      if (event.touches.length === 1) {
        // Implement pan logic here
      }

      // Handle pinch-to-zoom
      if (event.touches.length === 2) {
        // Implement zoom logic here
        event.preventDefault();
      }
    },
    [isTouchDevice]
  );

  const handleTouchEnd = useCallback((): void => {
    if (!isTouchDevice) return;

    // Reset touch state
    // Implement touch end logic here
  }, [isTouchDevice]);

  // Zoom and pan controls
  const zoomIn = useCallback((): void => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  }, []);

  const zoomOut = useCallback((): void => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  }, []);

  const resetZoom = useCallback((): void => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const panTo = useCallback((x: number, y: number): void => {
    setPanOffset({ x, y });
  }, []);

  // Responsive utilities
  const shouldShowSidebar = useCallback((): boolean => {
    return !isMobile;
  }, [isMobile]);

  const shouldCollapseTabs = useCallback((): boolean => {
    return isMobile || isTablet;
  }, [isMobile, isTablet]);

  const getMaxVisibleTabs = useCallback((): number => {
    if (isMobile) return 2;
    if (isTablet) return 4;
    if (isDesktop) return 6;
    return 8; // ultrawide
  }, [isMobile, isTablet, isDesktop]);

  return {
    // State
    currentBreakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isUltrawide,
    screenWidth,
    screenHeight,
    currentLayout,
    isTouchDevice,
    supportsHover,
    isPortrait,
    isLandscape,

    // Actions
    updateLayoutForBreakpoint,
    getOptimalWidgetSize,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    zoomIn,
    zoomOut,
    resetZoom,
    panTo,
    shouldShowSidebar,
    shouldCollapseTabs,
    getMaxVisibleTabs,
  };
};

export default useResponsiveDashboard;
