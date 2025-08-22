import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { router } from './router';

// Initialize performance monitoring and service worker
import { performanceService } from './services/performanceService';
import { serviceWorkerManager } from './utils/serviceWorker';
import { logger } from './utils/logger';

// Start performance monitoring
performanceService.startMonitoring();

// Register service worker in production
if (import.meta.env.PROD) {
  serviceWorkerManager
    .register()
    .then(registration => {
      if (registration) {
        logger.info('Service Worker registered successfully');
      }
    })
    .catch(error => {
      logger.error('Service Worker registration failed', { error });
    });
}

// Record initial page load performance
window.addEventListener('load', () => {
  // Record page load time
  if ('timing' in performance) {
    const timing = performance.timing;
    const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
    if (pageLoadTime > 0) {
      performanceService.recordMetric('pageLoadTime', pageLoadTime);
    }
  }

  // Record bundle size
  if ('getEntriesByType' in performance) {
    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];
    const jsResources = resources.filter(
      resource =>
        resource.name.includes('.js') && !resource.name.includes('node_modules')
    );
    const totalSize = jsResources.reduce(
      (sum, resource) => sum + (resource.transferSize || 0),
      0
    );
    performanceService.recordMetric('bundleSize', totalSize);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
