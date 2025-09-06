import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders MarketPulse heading', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: /marketpulse/i });
    expect(heading).toBeInTheDocument();
  });

  it('displays project completion message', () => {
    render(<App />);
    const message = screen.getByText(
      /project structure and build configuration completed successfully/i
    );
    expect(message).toBeInTheDocument();
  });
});
