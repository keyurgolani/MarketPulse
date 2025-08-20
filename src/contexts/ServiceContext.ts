/**
 * Service Context
 * Context for accessing application services
 */

import { createContext } from 'react';
import type { ServiceStatus } from '@/hooks/useServiceInitialization';

export interface ServiceContextValue {
  status: ServiceStatus;
  reconnectWebSocket: () => Promise<void>;
  triggerSync: () => Promise<{ success: boolean; error?: string }>;
  isInitialized: boolean;
}

export const ServiceContext = createContext<ServiceContextValue | null>(null);
