import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders MarketPulse heading', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: /marketpulse/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders financial dashboard platform text', () => {
    render(<App />);
    const text = screen.getByText(/financial dashboard platform/i);
    expect(text).toBeInTheDocument();
  });

  it('increments count when button is clicked', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /count is 0/i });

    fireEvent.click(button);

    expect(
      screen.getByRole('button', { name: /count is 1/i })
    ).toBeInTheDocument();
  });

  it('has accessible button', () => {
    render(<App />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAccessibleName();
  });
});
