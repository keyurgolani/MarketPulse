import React from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Layout } from '@/components/layout/Layout';
import { DashboardContainer } from '@/components/dashboard';

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <Layout>
        <div className="h-full">
          <DashboardContainer
            className="h-full"
            showTabs={true}
            showHeader={true}
          />
        </div>
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
