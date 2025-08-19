import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  it('renders MarketPulse heading in header', () => {
    render(<App />);
    const heading = screen.getByRole('heading', {
      name: 'MarketPulse',
      level: 1,
    });
    expect(heading).toBeInTheDocument();
  });

  it('renders welcome heading', () => {
    render(<App />);
    const welcomeHeading = screen.getByRole('heading', {
      name: /welcome to marketpulse/i,
    });
    expect(welcomeHeading).toBeInTheDocument();
  });

  it('renders financial dashboard platform text', () => {
    render(<App />);
    const text = screen.getByText(
      /comprehensive financial dashboard platform/i
    );
    expect(text).toBeInTheDocument();
  });

  it('increments count when button is clicked', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /count: 0/i });

    fireEvent.click(button);

    expect(
      screen.getByRole('button', { name: /count: 1/i })
    ).toBeInTheDocument();
  });

  it('has theme toggle button with accessible name', () => {
    render(<App />);
    const themeButton = screen.getByRole('button', {
      name: /switch to.*theme/i,
    });
    expect(themeButton).toBeInTheDocument();
    expect(themeButton).toHaveAccessibleName();
  });

  it('renders UI components demo section', () => {
    render(<App />);
    const demoHeading = screen.getByRole('heading', {
      name: /ui components demo/i,
    });
    expect(demoHeading).toBeInTheDocument();
  });

  it('renders all button variants', () => {
    render(<App />);
    expect(
      screen.getByRole('button', { name: /count: 0/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /secondary/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /outline/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ghost/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /async action/i })
    ).toBeInTheDocument();
  });

  it('renders input component with label', () => {
    render(<App />);
    const input = screen.getByRole('textbox', { name: /sample input/i });
    expect(input).toBeInTheDocument();
  });
});
