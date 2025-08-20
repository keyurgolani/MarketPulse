/**
 * Dashboard Container Tests
 * Tests for the main dashboard container component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardContainer } from '../DashboardContainer';
import type { Dashboard } from '@/types/dashboard';

// Helper function to render with Router context
const renderWithRouter = (
  component: React.ReactElement
): ReturnType<typeof render> => {
  return render(<MemoryRouter>{component}</MemoryRouter>);
};

// Mock the dashboard store
vi.mock('@/stores/dashboardStore', () => ({
  useActiveDashboard: vi.fn(),
  useDashboardStore: vi.fn(),
}));

// Mock the API store
vi.mock('@/stores/apiStore', () => ({
  useApiStore: vi.fn(() => ({
    startLoading: vi.fn(),
    stopLoading: vi.fn(),
  })),
}));

// Mock child components
vi.mock('../DashboardLayout', () => ({
  DashboardLayout: ({
    dashboard,
  }: {
    dashboard: Dashboard;
  }): React.JSX.Element => (
    <div data-testid="dashboard-layout">
      Dashboard Layout for {dashboard.name}
    </div>
  ),
}));

vi.mock('../DashboardHeader', () => ({
  DashboardHeader: ({
    dashboard,
  }: {
    dashboard: Dashboard;
  }): React.JSX.Element => (
    <div data-testid="dashboard-header">
      Dashboard Header for {dashboard.name}
    </div>
  ),
}));

vi.mock('../DashboardTabs', () => ({
  DashboardTabs: ({
    dashboards,
  }: {
    dashboards: Dashboard[];
  }): React.JSX.Element => (
    <div data-testid="dashboard-tabs">{dashboards.length} dashboard tabs</div>
  ),
}));

describe('DashboardContainer', () => {
  const mockDashboard: Dashboard = {
    id: 'test-dashboard',
    name: 'Test Dashboard',
    description: 'A test dashboard',
    isDefault: false,
    isPublic: false,
    ownerId: 'user-1',
    widgets: [],
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when no dashboard is active', async (): Promise<void> => {
    const { useActiveDashboard, useDashboardStore } = await import(
      '@/stores/dashboardStore'
    );

    (useActiveDashboard as any).mockReturnValue(null);
    (useDashboardStore as any).mockReturnValue({
      dashboards: [],
      defaultDashboards: [],
      isLoading: true,
      error: null,
      loadDashboards: vi.fn(),
      loadDefaultDashboards: vi.fn(),
      setActiveDashboard: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter(<DashboardContainer />);

    expect(screen.getByText('Loading dashboards...')).toBeInTheDocument();
  });

  it('renders dashboard when active dashboard is available', async (): Promise<void> => {
    const { useActiveDashboard, useDashboardStore } = await import(
      '@/stores/dashboardStore'
    );

    (useActiveDashboard as any).mockReturnValue(mockDashboard);
    (useDashboardStore as any).mockReturnValue({
      dashboards: [mockDashboard],
      defaultDashboards: [],
      isLoading: false,
      error: null,
      loadDashboards: vi.fn(),
      loadDefaultDashboards: vi.fn(),
      setActiveDashboard: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter(<DashboardContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });
  });

  it('renders error state when there is an error', async (): Promise<void> => {
    const { useActiveDashboard, useDashboardStore } = await import(
      '@/stores/dashboardStore'
    );

    (useActiveDashboard as any).mockReturnValue(null);
    (useDashboardStore as any).mockReturnValue({
      dashboards: [],
      defaultDashboards: [],
      isLoading: false,
      error: 'Failed to load dashboards',
      loadDashboards: vi.fn(),
      loadDefaultDashboards: vi.fn(),
      setActiveDashboard: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter(<DashboardContainer />);

    expect(screen.getByText('Failed to Load Dashboards')).toBeInTheDocument();
    expect(screen.getByText('Failed to load dashboards')).toBeInTheDocument();
  });

  it('renders empty state when no dashboards are available', async (): Promise<void> => {
    const { useActiveDashboard, useDashboardStore } = await import(
      '@/stores/dashboardStore'
    );

    (useActiveDashboard as any).mockReturnValue(null);
    (useDashboardStore as any).mockReturnValue({
      dashboards: [],
      defaultDashboards: [],
      isLoading: false,
      error: null,
      loadDashboards: vi.fn(),
      loadDefaultDashboards: vi.fn(),
      setActiveDashboard: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter(<DashboardContainer />);

    expect(screen.getByText('No Dashboards Available')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first dashboard to get started.')
    ).toBeInTheDocument();
  });

  it('shows tabs when multiple dashboards are available', async (): Promise<void> => {
    const { useActiveDashboard, useDashboardStore } = await import(
      '@/stores/dashboardStore'
    );

    const secondDashboard = {
      ...mockDashboard,
      id: 'dashboard-2',
      name: 'Dashboard 2',
    };

    (useActiveDashboard as any).mockReturnValue(mockDashboard);
    (useDashboardStore as any).mockReturnValue({
      dashboards: [mockDashboard],
      defaultDashboards: [secondDashboard],
      isLoading: false,
      error: null,
      loadDashboards: vi.fn(),
      loadDefaultDashboards: vi.fn(),
      setActiveDashboard: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter(<DashboardContainer showTabs={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-tabs')).toBeInTheDocument();
      expect(screen.getByText('2 dashboard tabs')).toBeInTheDocument();
    });
  });

  it('hides tabs when showTabs is false', async (): Promise<void> => {
    const { useActiveDashboard, useDashboardStore } = await import(
      '@/stores/dashboardStore'
    );

    (useActiveDashboard as any).mockReturnValue(mockDashboard);
    (useDashboardStore as any).mockReturnValue({
      dashboards: [mockDashboard],
      defaultDashboards: [],
      isLoading: false,
      error: null,
      loadDashboards: vi.fn(),
      loadDefaultDashboards: vi.fn(),
      setActiveDashboard: vi.fn(),
      clearError: vi.fn(),
    });

    renderWithRouter(<DashboardContainer showTabs={false} />);

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-tabs')).not.toBeInTheDocument();
    });
  });
});
