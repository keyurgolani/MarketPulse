import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Loading } from '../Loading';

describe('Loading', () => {
  it('should render loading spinner', () => {
    render(<Loading />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should render with custom text when provided', () => {
    render(<Loading text="Loading data..." />);

    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should render with small size', () => {
    render(<Loading size="sm" />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  it('should render with medium size (default)', () => {
    render(<Loading size="md" />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('should render with large size', () => {
    render(<Loading size="lg" />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toHaveClass('h-12', 'w-12');
  });

  it('should accept custom className', () => {
    render(<Loading className="custom-class" />);

    const container = document.querySelector('.custom-class');
    expect(container).toBeInTheDocument();
  });

  it('should render spinner with proper styling', () => {
    render(<Loading />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('text-blue-600');
  });

  it('should center content properly', () => {
    render(<Loading />);

    const container = document.querySelector(
      '.flex.items-center.justify-center'
    );
    expect(container).toBeInTheDocument();
  });

  it('should handle long loading text', () => {
    const longText =
      'This is a very long loading message that should still display properly';
    render(<Loading text={longText} />);

    expect(screen.getByText(longText)).toBeInTheDocument();
  });

  it('should render text with proper accessibility', () => {
    render(<Loading text="Loading..." />);

    const text = screen.getByText('Loading...');
    expect(text).toHaveAttribute('aria-live', 'polite');
  });
});
