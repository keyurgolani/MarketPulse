import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }): React.JSX.Element => <div>{children}</div>,
  Route: ({ element }: { element: React.ReactNode }): React.JSX.Element => <div>{element}</div>,
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getAllByText(/marketpulse/i)).toHaveLength(2); // Header and footer
  });

  it('displays dashboard content', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });
});
