/**
 * Not Found Page Component
 * Displays 404 error page
 */

import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export const NotFoundPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Page Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Go back to dashboard
            </a>
          </div>
        </div>
      </Layout>
    </ErrorBoundary>
  );
};

export default NotFoundPage;
