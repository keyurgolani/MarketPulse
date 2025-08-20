/**
 * Dashboard Route Component
 * Handles URL parameters for dashboard navigation
 */

import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DashboardContainer } from '@/components/dashboard';

export const DashboardRoute: React.FC = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const [searchParams] = useSearchParams();

  // Extract additional URL parameters
  const editMode = searchParams.get('edit') === 'true';
  const tab = searchParams.get('tab');
  const widget = searchParams.get('widget');

  return (
    <DashboardContainer
      className="h-full"
      showTabs={true}
      showHeader={true}
      initialDashboardId={dashboardId}
      initialEditMode={editMode}
      initialTab={tab}
      initialWidget={widget}
    />
  );
};

export default DashboardRoute;
