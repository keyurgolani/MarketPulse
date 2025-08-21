import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardHeader } from '../DashboardHeader';
import type { Dashboard } from '@/types/dashboard';

// Mock the stores
vi.mock('@/stores/dashboardStore', () => ({
  useEditMode: vi.fn(() => false),
  useDashboardStore: vi.fn(() => ({
    setEditMode: vi.fn(),
  })),
}));

// Mock the SyncStatusIndicator component
vi.mock('../SyncStatusIndicator', () => ({
  SyncStatusIndicator: (): JSX.Element => (
    <div data-testid="sync-status">Sync Status</div>
  ),
}));

describe('DashboardHeader', () => {
  const mockDashboard: Dashboard = {
    id: 'test-dashboard',
    name: 'Test Dashboard',
    description: 'Test dashboard description',
    isDefault: false,
    isPublic: false,
    tags: ['test', 'dashboard'],
    widgets: [],
    layout: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'test-user',
  };

  const defaultProps = {
    dashboard: mockDashboard,
    onRefresh: vi.fn(),
    onEdit: vi.fn(),
    onShare: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard title', () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
  });

  it('should render dashboard description', () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(screen.getByText('Test dashboard description')).toBeInTheDocument();
  });

  it('should render dashboard tags', () => {
    render(<DashboardHeader {...defaultProps} />);

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    render(<DashboardHeader {...defaultProps} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it('should call onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(<DashboardHeader {...defaultProps} onRefresh={onRefresh} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('should render share button for non-default dashboards', () => {
    render(<DashboardHeader {...defaultProps} />);

    const shareButton = screen.getByRole('button', { name: /share/i });
    expect(shareButton).toBeInTheDocument();
  });

  it('should call onShare when share button is clicked', () => {
    const onShare = vi.fn();
    render(<DashboardHeader {...defaultProps} onShare={onShare} />);

    const shareButton = screen.getByRole('button', { name: /share/i });
    fireEvent.click(shareButton);

    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('should render edit button for non-default dashboards', () => {
    render(<DashboardHeader {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    expect(editButton).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<DashboardHeader {...defaultProps} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('should not render share and edit buttons for default dashboards', () => {
    const defaultDashboard = { ...mockDashboard, isDefault: true };
    render(<DashboardHeader {...defaultProps} dashboard={defaultDashboard} />);

    expect(
      screen.queryByRole('button', { name: /share/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /edit/i })
    ).not.toBeInTheDocument();
  });

  it('should show default badge for default dashboards', () => {
    const defaultDashboard = { ...mockDashboard, isDefault: true };
    render(<DashboardHeader {...defaultProps} dashboard={defaultDashboard} />);

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('should show public badge for public dashboards', () => {
    const publicDashboard = { ...mockDashboard, isPublic: true };
    render(<DashboardHeader {...defaultProps} dashboard={publicDashboard} />);

    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<DashboardHeader {...defaultProps} className="custom-header" />);

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('custom-header');
  });

  it('should be accessible', () => {
    render(<DashboardHeader {...defaultProps} />);

    // Check for proper ARIA labels and roles
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toHaveAttribute(
      'type',
      'button'
    );
    expect(screen.getByRole('button', { name: /share/i })).toHaveAttribute(
      'type',
      'button'
    );
    expect(screen.getByRole('button', { name: /edit/i })).toHaveAttribute(
      'type',
      'button'
    );
  });
});
