/**
 * App Component Tests
 */

import React from 'react';
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
  DashboardContainer: ({
    className,
  }: {
    className?: string;
  }): React.JSX.Element => (
    <div className={className} data-testid="dashboard-container">
      Dashboard Container
    </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders deprecated message', (): void => {
    render(<App />);
    const heading = screen.getByRole('heading', {
      name: /app component deprecated/i,
    });
    expect(heading).toBeInTheDocument();
  });

  it('renders deprecation notice', (): void => {
    render(<App />);
    const notice = screen.getByText(/this component has been replaced/i);
    expect(notice).toBeInTheDocument();
  });

  it('displays centered layout', (): void => {
    render(<App />);
    const container = screen
      .getByText(/app component deprecated/i)
      .closest('div');
    expect(container).toHaveClass('text-center');
  });

  it('shows full screen layout', (): void => {
    render(<App />);
    const container = screen
      .getByText(/app component deprecated/i)
      .closest('div');
    expect(container?.parentElement).toHaveClass('h-screen');
  });
});
