import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingSpinner, Skeleton, LoadingOverlay } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('h-4', 'w-4');

    rerender(<LoadingSpinner size="md" />);
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('h-6', 'w-6');

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('h-8', 'w-8');

    rerender(<LoadingSpinner size="xl" />);
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('h-12', 'w-12');
  });

  it('renders different colors correctly', () => {
    const { rerender } = render(<LoadingSpinner color="primary" />);
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('text-primary-600');

    rerender(<LoadingSpinner color="white" />);
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('text-white');

    rerender(<LoadingSpinner color="gray" />);
    expect(screen.getByRole('status').querySelector('svg')).toHaveClass('text-gray-600');
  });

  it('renders custom label', () => {
    render(<LoadingSpinner label="Processing..." />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    
    expect(screen.getByRole('status')).toHaveClass('custom-spinner');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner label="Custom loading" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText('Custom loading')).toHaveClass('sr-only');
  });

  it('has spinning animation', () => {
    render(<LoadingSpinner />);
    
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });
});

describe('Skeleton', () => {
  it('renders with default props', () => {
    render(<Skeleton />);
    
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveClass('animate-pulse', 'bg-gray-200', 'rounded');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Skeleton variant="text" />);
    expect(document.querySelector('[aria-hidden="true"]')).toHaveClass('h-4', 'rounded');

    rerender(<Skeleton variant="rectangular" />);
    expect(document.querySelector('[aria-hidden="true"]')).toHaveClass('rounded');

    rerender(<Skeleton variant="circular" />);
    expect(document.querySelector('[aria-hidden="true"]')).toHaveClass('rounded-full');
  });

  it('applies custom dimensions', () => {
    render(<Skeleton width={100} height={50} />);
    
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({ width: '100px', height: '50px' });
  });

  it('applies string dimensions', () => {
    render(<Skeleton width="100%" height="2rem" />);
    
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveStyle({ width: '100%', height: '2rem' });
  });

  it('applies custom className', () => {
    render(<Skeleton className="custom-skeleton" />);
    
    expect(document.querySelector('[aria-hidden="true"]')).toHaveClass('custom-skeleton');
  });

  it('has proper accessibility attributes', () => {
    render(<Skeleton />);
    
    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('LoadingOverlay', () => {
  it('renders children when not loading', () => {
    render(
      <LoadingOverlay isLoading={false}>
        <div>Content</div>
      </LoadingOverlay>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders overlay when loading', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getAllByText('Loading...')).toHaveLength(2); // One in spinner, one in message
  });

  it('renders custom message', () => {
    render(
      <LoadingOverlay isLoading={true} message="Processing data...">
        <div>Content</div>
      </LoadingOverlay>
    );
    
    expect(screen.getAllByText('Processing data...')).toHaveLength(2); // One in spinner, one in message
  });

  it('renders with custom spinner size', () => {
    render(
      <LoadingOverlay isLoading={true} spinnerSize="xl">
        <div>Content</div>
      </LoadingOverlay>
    );
    
    const svg = screen.getByRole('status').querySelector('svg');
    expect(svg).toHaveClass('h-12', 'w-12');
  });

  it('applies custom className', () => {
    render(
      <LoadingOverlay isLoading={false} className="custom-overlay">
        <div>Content</div>
      </LoadingOverlay>
    );
    
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-overlay');
  });

  it('has proper overlay styling when loading', () => {
    render(
      <LoadingOverlay isLoading={true}>
        <div>Content</div>
      </LoadingOverlay>
    );
    
    const overlay = screen.getByRole('status').parentElement?.parentElement;
    expect(overlay).toHaveClass('absolute', 'inset-0', 'bg-white', 'bg-opacity-75');
  });
});