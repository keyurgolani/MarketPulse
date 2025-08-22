/**
 * Lazy Loading Utilities
 * Provides intelligent component lazy loading with error boundaries and loading states
 */

import React, {
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { logger } from './logger';

export interface LazyLoadOptions {
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  retryAttempts?: number;
  retryDelay?: number;
  preload?: boolean;
  chunkName?: string;
}

// Default loading component
const DefaultLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Default error component
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({
  error,
  retry,
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-600 mb-4">
      <svg
        className="w-12 h-12 mx-auto mb-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      Failed to load component
    </h3>
    <p className="text-gray-600 mb-4 max-w-md">
      {error.message ||
        'An unexpected error occurred while loading this component.'}
    </p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      Try Again
    </button>
  </div>
);

/**
 * Enhanced lazy loading with error boundaries and retry logic
 */
export function createLazyComponent<
  T extends ComponentType<Record<string, unknown>>,
>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const {
    fallback: LoadingComponent = DefaultLoadingFallback,
    errorFallback: ErrorComponent = DefaultErrorFallback,
    retryAttempts = 3,
    retryDelay = 1000,
    preload = false,
    chunkName,
  } = options;

  let retryCount = 0;
  let componentPromise: Promise<{ default: T }> | null = null;

  const loadComponent = async (): Promise<{ default: T }> => {
    try {
      logger.debug('Loading lazy component', { chunkName, retryCount });

      const startTime = performance.now();
      const module = await importFn();
      const loadTime = performance.now() - startTime;

      logger.debug('Lazy component loaded successfully', {
        chunkName,
        loadTime: Math.round(loadTime),
        retryCount,
      });

      retryCount = 0; // Reset retry count on success
      return module;
    } catch (error) {
      logger.error('Lazy component loading failed', {
        chunkName,
        retryCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (retryCount < retryAttempts) {
        retryCount++;

        logger.info('Retrying lazy component load', {
          chunkName,
          retryCount,
          maxRetries: retryAttempts,
        });

        // Wait before retrying
        await new Promise(resolve =>
          setTimeout(resolve, retryDelay * retryCount)
        );
        return loadComponent();
      }

      throw error;
    }
  };

  // Create the lazy component
  const LazyComponent = React.lazy(() => {
    if (!componentPromise) {
      componentPromise = loadComponent();
    }
    return componentPromise;
  });

  // Preload if requested
  if (preload) {
    componentPromise = loadComponent();
  }

  // Create wrapper component with error boundary
  const WrappedComponent: React.FC<Record<string, unknown>> = props => {
    const [error, setError] = React.useState<Error | null>(null);
    const [key, setKey] = React.useState(0);

    const retry = React.useCallback(() => {
      setError(null);
      componentPromise = null; // Reset the promise
      setKey(prev => prev + 1); // Force re-render
    }, []);

    if (error) {
      return <ErrorComponent error={error} retry={retry} />;
    }

    return (
      <Suspense fallback={<LoadingComponent />}>
        <ErrorBoundary onError={setError}>
          {React.createElement(
            LazyComponent as unknown as React.ComponentType<
              Record<string, unknown>
            >,
            { key, ...props }
          )}
        </ErrorBoundary>
      </Suspense>
    );
  };

  // Add preload method
  (
    WrappedComponent as unknown as { preload: () => Promise<{ default: T }> }
  ).preload = (): Promise<{
    default: T;
  }> => {
    if (!componentPromise) {
      componentPromise = loadComponent();
    }
    return componentPromise;
  };

  return WrappedComponent as unknown as LazyExoticComponent<T>;
}

/**
 * Error boundary component for lazy loading
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    onError: (error: Error) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    logger.error('Lazy component error boundary caught error', {
      error: error.message,
      stack: error.stack,
    });

    this.props.onError(error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null; // Let parent handle error display
    }

    return this.props.children;
  }
}

/**
 * Route-based code splitting helper
 */
export function createLazyRoute<
  T extends ComponentType<Record<string, unknown>>,
>(
  importFn: () => Promise<{ default: T }>,
  chunkName?: string
): LazyExoticComponent<T> {
  return createLazyComponent(importFn, {
    chunkName: chunkName || 'route',
    preload: false,
    retryAttempts: 3,
    retryDelay: 1000,
  });
}
