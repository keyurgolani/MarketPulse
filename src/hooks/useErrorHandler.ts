import React from 'react';

// Hook for functional components to handle errors
export const useErrorHandler = (): ((error: Error) => void) => {
  return React.useCallback((error: Error) => {
    // In a real app, you might want to send this to an error reporting service
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', error);
    
    // For now, we'll just throw the error to be caught by the nearest ErrorBoundary
    throw error;
  }, []);
};