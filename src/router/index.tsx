/**
 * Application Router Configuration
 * Handles routing for dashboard navigation and deep linking
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '@/components/routing/RootLayout';
import { DashboardRoute } from '@/components/routing/DashboardRoute';
import { NotFoundPage } from '@/components/routing/NotFoundPage';

// Create the router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardRoute />,
      },
      {
        path: 'dashboard/:dashboardId',
        element: <DashboardRoute />,
      },
      {
        path: 'dashboard/:dashboardId/edit',
        element: <DashboardRoute />,
      },
      {
        path: 'dashboard/:dashboardId/share',
        element: <DashboardRoute />,
      },
      // Catch-all route for invalid dashboard URLs
      {
        path: 'dashboard/*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);

export default router;
