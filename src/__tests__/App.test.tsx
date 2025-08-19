/**
 * App Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

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

// Mock the dashboard container
vi.mock('@/components/dashboard', () => ({
  DashboardContainer: ({ className }: { className?: string }) => (
    <div className={className} data-testid="dashboard-container">
      Dashboard Container
    </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders MarketPulse heading', async () => {
    const { useDashboardStore } = await import('@/stores/dashboardStore');

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

    render(<App />);
    const heading = screen.getByRole('heading', { name: /marketpulse/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders dashboard container', async () => {
    const { useDashboardStore } = await import('@/stores/dashboardStore');

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

    render(<App />);
    const dashboardContainer = screen.getByTestId('dashboard-container');
    expect(dashboardContainer).toBeInTheDocument();
  });

  it('renders theme toggle button', async () => {
    const { useDashboardStore } = await import('@/stores/dashboardStore');

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

    render(<App />);
    const themeButton = screen.getByRole('button', {
      name: /switch to.*theme/i,
    });
    expect(themeButton).toBeInTheDocument();
  });

  it('renders with proper layout structure', async () => {
    const { useDashboardStore } = await import('@/stores/dashboardStore');

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

    render(<App />);

    // Check for main layout elements
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('main')).toBeInTheDocument(); // main content
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
  });
});
