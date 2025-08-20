/**
 * Root Layout Component
 * Main layout wrapper for the application
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { DefaultDashboardProvider } from '@/components/dashboard/DefaultDashboardProvider';
import { ServiceProvider } from '@/components/providers/ServiceProvider';

export const RootLayout: React.FC = () => {
  return (
    <ErrorBoundary>
      <ServiceProvider
        enableWebSocket={true}
        enableOfflineSync={true}
        enableDashboardSync={true}
        autoConnect={true}
        showStatus={import.meta.env.DEV} // Show status indicator in development
      >
        <DefaultDashboardProvider autoProvision={true} showStatus={true}>
          <Layout>
            <div className="h-full">
              <Outlet />
            </div>
          </Layout>
        </DefaultDashboardProvider>
      </ServiceProvider>
    </ErrorBoundary>
  );
};

export default RootLayout;
