import React from 'react';
import { ErrorBoundary } from '@/components/ui';
import { AppRouter } from '@/router';

export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}
