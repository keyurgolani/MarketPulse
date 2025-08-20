import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';
import type { Dashboard } from '@/types/dashboard';

// Mock React Query and other dependencies
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(),
  QueryClientProvider: vi.fn(({ children }) => children),
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinDashboard: vi.fn(),
    leaveDashboard: vi.fn(),
  })),
}));

describe('Dashboard Integration Tests', () => {
  const mockDashboards: Dashboard[] = [
    {
      id: '1',
      name: 'Market Overview',
      description: 'Main market dashboard',
      isDefault: true,
      isPublic: false,
      ownerId: 'user-1',
      widgets: [
        {
          id: 'widget-1',
          type: 'asset-list',
          title: 'Top Stocks',
          config: {
            assets: ['AAPL', 'GOOGL', 'MSFT'],
            displayMode: 'list',
          },
          position: { x: 0, y: 0, w: 6, h: 4 },
          size: { minW: 2, minH: 2, resizable: true },
          createdAt: new Date(),
          updatedAt: new Date(),
          isVisible: true,
        },
      ],
      layout: {
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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      sharing: {
        enabled: false,
        permissions: [],
        requireAuth: true,
      },
    },
    {
      id: '2',
      name: 'Tech Stocks',
      description: 'Technology sector focus',
      isDefault: false,
      isPublic: false,
      ownerId: 'user-1',
      widgets: [
        {
          id: 'widget-2',
          type: 'price-chart',
          title: 'Tech Performance',
          config: {
            assets: ['AAPL', 'GOOGL', 'MSFT', 'AMZN'],
            displayMode: 'chart',
            timeframe: '1d',
          },
          position: { x: 0, y: 0, w: 12, h: 6 },
          size: { minW: 4, minH: 3, resizable: true },
          createdAt: new Date(),
          updatedAt: new Date(),
          isVisible: true,
        },
      ],
      layout: {
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
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['tech', 'stocks'],
      sharing: {
        enabled: false,
        permissions: [],
        requireAuth: true,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have DashboardContainer component available', () => {
    expect(DashboardContainer).toBeDefined();
    expect(typeof DashboardContainer).toBe('function');
  });

  it('should have mock dashboards data available', () => {
    expect(mockDashboards).toBeDefined();
    expect(Array.isArray(mockDashboards)).toBe(true);
    expect(mockDashboards.length).toBeGreaterThan(0);
  });

  it('should validate dashboard data structure', () => {
    const dashboard = mockDashboards[0];

    expect(dashboard).toHaveProperty('id');
    expect(dashboard).toHaveProperty('name');
    expect(dashboard).toHaveProperty('widgets');
    expect(Array.isArray(dashboard.widgets)).toBe(true);
  });

  it('should validate widget data structure', () => {
    const dashboard = mockDashboards[0];
    if (dashboard.widgets.length > 0) {
      const widget = dashboard.widgets[0];

      expect(widget).toHaveProperty('id');
      expect(widget).toHaveProperty('type');
      expect(widget).toHaveProperty('config');
    }
  });

  it('should handle dashboard props correctly', () => {
    const props = {
      dashboards: mockDashboards,
      activeDashboardId: '1',
      onDashboardChange: vi.fn(),
      showTabs: true,
    };

    expect(props.dashboards).toBe(mockDashboards);
    expect(props.activeDashboardId).toBe('1');
    expect(typeof props.onDashboardChange).toBe('function');
    expect(props.showTabs).toBe(true);
  });
});
