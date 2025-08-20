/**
 * Hook to access service context
 */

import { useContext } from 'react';
import {
  ServiceContext,
  type ServiceContextValue,
} from '@/contexts/ServiceContext';

export function useServices(): ServiceContextValue {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}
