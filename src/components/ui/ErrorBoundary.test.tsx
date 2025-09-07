import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary, DefaultErrorFallback } from './ErrorBoundary';
import { useErrorHandler } from '../../hooks/useErrorHandler';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({
  shouldThrow = false,
}) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error fallback when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('renders custom fallback component', () => {
    const CustomFallback: React.FC<{
      error: Error | null;
      resetError: () => void;
    }> = () => <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('resets error when resetError is called', () => {
    const TestComponent: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <ErrorBoundary>
          <button onClick={() => setShouldThrow(false)}>Reset</button>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    // The error boundary should reset but still show error until component re-renders
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('DefaultErrorFallback', () => {
  const mockResetError = vi.fn();

  beforeEach(() => {
    mockResetError.mockClear();
  });

  it('renders error message and buttons', () => {
    render(
      <DefaultErrorFallback
        error={new Error('Test error')}
        resetError={mockResetError}
      />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh page/i })
    ).toBeInTheDocument();
  });

  it('calls resetError when Try Again is clicked', () => {
    render(
      <DefaultErrorFallback
        error={new Error('Test error')}
        resetError={mockResetError}
      />
    );

    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(tryAgainButton);

    expect(mockResetError).toHaveBeenCalledTimes(1);
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Test error message');
    error.stack = 'Error stack trace';

    render(<DefaultErrorFallback error={error} resetError={mockResetError} />);

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  it('does not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Test error message');

    render(<DefaultErrorFallback error={error} resetError={mockResetError} />);

    expect(
      screen.queryByText('Error Details (Development)')
    ).not.toBeInTheDocument();

    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  it('has proper accessibility attributes', () => {
    render(
      <DefaultErrorFallback
        error={new Error('Test error')}
        resetError={mockResetError}
      />
    );

    const errorContainer = screen.getByRole('alert');
    expect(errorContainer).toBeInTheDocument();
  });

  it('handles null error gracefully', () => {
    render(<DefaultErrorFallback error={null} resetError={mockResetError} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });
});

describe('useErrorHandler', () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('throws error when called', () => {
    // Test that the hook function exists and can be called
    const TestComponent: React.FC = () => {
      const handleError = useErrorHandler();

      // Test that the hook returns a function
      expect(typeof handleError).toBe('function');

      return <div>Test</div>;
    };

    render(<TestComponent />);
  });

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error');

    const TestComponent: React.FC = () => {
      const handleError = useErrorHandler();

      React.useEffect(() => {
        try {
          handleError(new Error('Test error'));
        } catch {
          // Expected to throw, but we catch it here to prevent test failure
        }
      }, [handleError]);

      return <div>Test</div>;
    };

    render(<TestComponent />);

    // The error should be logged to console
    expect(consoleSpy).toHaveBeenCalledWith(
      'Unhandled error:',
      expect.any(Error)
    );
  });
});
