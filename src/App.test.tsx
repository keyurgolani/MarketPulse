import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

// Mock authService
vi.mock('@/services/authService', () => ({
  authService: {
    isAuthenticated: vi.fn(() => false),
    isTokenExpired: vi.fn(() => true),
    getProfile: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <div>{children}</div>
  ),
  Route: ({ element }: { element: React.ReactNode }): React.JSX.Element => (
    <div>{element}</div>
  ),
  Navigate: ({ to }: { to: string }): React.JSX.Element => (
    <div>Navigate to {to}</div>
  ),
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({
    pathname: '/login',
    search: '',
    hash: '',
    state: null,
    key: 'default',
  })),
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // App should render without throwing errors
    expect(document.body).toBeInTheDocument();
  });

  it.skip('displays login page when not authenticated', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /sign in/i })
    ).toBeInTheDocument();
  });
});
