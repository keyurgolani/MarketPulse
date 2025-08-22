/**
 * Service Worker Registration and Management
 * Handles service worker lifecycle, caching strategies, and offline functionality
 */

import { logger } from './logger';

export interface ServiceWorkerConfig {
  enabled: boolean;
  swUrl: string;
  scope: string;
  updateCheckInterval: number;
  enableBackgroundSync: boolean;
  enablePushNotifications: boolean;
}

export interface CacheStats {
  [cacheName: string]: {
    entryCount: number;
    urls: string[];
  };
}

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isControlling: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  isOnline: boolean;
}

class ServiceWorkerManager {
  private config: ServiceWorkerConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private updateCheckTimer: NodeJS.Timeout | null = null;
  private state: ServiceWorkerState = {
    isSupported: false,
    isRegistered: false,
    isControlling: false,
    registration: null,
    updateAvailable: false,
    isOnline: navigator.onLine,
  };
  private listeners: Set<(state: ServiceWorkerState) => void> = new Set();

  constructor(config: Partial<ServiceWorkerConfig> = {}) {
    this.config = {
      enabled: true,
      swUrl: '/sw.js',
      scope: '/',
      updateCheckInterval: 60 * 60 * 1000, // 1 hour
      enableBackgroundSync: true,
      enablePushNotifications: false,
      ...config,
    };

    this.state.isSupported = 'serviceWorker' in navigator;
    this.setupEventListeners();
  }

  /**
   * Register service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.config.enabled || !this.state.isSupported) {
      logger.info('Service Worker not supported or disabled');
      return null;
    }

    try {
      logger.info('Registering Service Worker', {
        url: this.config.swUrl,
        scope: this.config.scope,
      });

      this.registration = await navigator.serviceWorker.register(
        this.config.swUrl,
        {
          scope: this.config.scope,
        }
      );

      this.state.isRegistered = true;
      this.state.registration = this.registration;
      this.state.isControlling = !!navigator.serviceWorker.controller;

      this.setupRegistrationEventListeners();
      this.startUpdateCheck();
      this.notifyStateChange();

      logger.info('Service Worker registered successfully', {
        scope: this.registration.scope,
        state: this.registration.installing
          ? 'installing'
          : this.registration.waiting
            ? 'waiting'
            : this.registration.active
              ? 'active'
              : 'unknown',
      });

      return this.registration;
    } catch (error) {
      logger.error('Service Worker registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();

      if (result) {
        this.registration = null;
        this.state.isRegistered = false;
        this.state.registration = null;
        this.state.isControlling = false;
        this.stopUpdateCheck();
        this.notifyStateChange();

        logger.info('Service Worker unregistered successfully');
      }

      return result;
    } catch (error) {
      logger.error('Service Worker unregistration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Update service worker
   */
  async update(): Promise<void> {
    if (!this.registration) {
      logger.warn('Cannot update: Service Worker not registered');
      return;
    }

    try {
      await this.registration.update();
      logger.info('Service Worker update check completed');
    } catch (error) {
      logger.error('Service Worker update failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      logger.warn('No waiting Service Worker to activate');
      return;
    }

    try {
      // Send message to service worker to skip waiting
      await this.sendMessage({ type: 'SKIP_WAITING' });

      // Wait for the new service worker to take control
      await new Promise<void>(resolve => {
        const handleControllerChange = (): void => {
          navigator.serviceWorker.removeEventListener(
            'controllerchange',
            handleControllerChange
          );
          resolve();
        };

        navigator.serviceWorker.addEventListener(
          'controllerchange',
          handleControllerChange
        );
      });

      this.state.updateAvailable = false;
      this.state.isControlling = true;
      this.notifyStateChange();

      logger.info('Service Worker activated successfully');
    } catch (error) {
      logger.error('Service Worker activation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    if (!this.state.isControlling) {
      return {};
    }

    try {
      const response = await this.sendMessage({ type: 'GET_CACHE_STATS' });
      return (response.payload as CacheStats) || ({} as CacheStats);
    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }

  /**
   * Clear cache
   */
  async clearCache(cacheType?: string): Promise<void> {
    if (!this.state.isControlling) {
      logger.warn('Cannot clear cache: Service Worker not controlling');
      return;
    }

    try {
      await this.sendMessage({
        type: 'CLEAR_CACHE',
        payload: { cacheType },
      });

      logger.info('Cache cleared successfully', { cacheType });
    } catch (error) {
      logger.error('Failed to clear cache', {
        cacheType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Prefetch URLs
   */
  async prefetchUrls(urls: string[]): Promise<void> {
    if (!this.state.isControlling) {
      logger.warn('Cannot prefetch: Service Worker not controlling');
      return;
    }

    try {
      await this.sendMessage({
        type: 'PREFETCH_URLS',
        payload: { urls },
      });

      logger.info('URLs prefetched successfully', { count: urls.length });
    } catch (error) {
      logger.error('Failed to prefetch URLs', {
        count: urls.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Register for background sync
   */
  async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.config.enableBackgroundSync || !this.registration) {
      return;
    }

    try {
      if ('sync' in this.registration) {
        await (
          this.registration as ServiceWorkerRegistration & {
            sync: { register: (tag: string) => Promise<void> };
          }
        ).sync.register(tag);
      }
      logger.info('Background sync registered', { tag });
    } catch (error) {
      logger.error('Background sync registration failed', {
        tag,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Request push notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!this.config.enablePushNotifications || !('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      logger.info('Notification permission', { permission });
      return permission;
    } catch (error) {
      logger.error('Notification permission request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 'denied';
    }
  }

  /**
   * Get current state
   */
  getState(): ServiceWorkerState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: ServiceWorkerState) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove state change listener
   */
  removeStateListener(listener: (state: ServiceWorkerState) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Send message to service worker
   */
  private async sendMessage(message: {
    type: string;
    payload?: unknown;
  }): Promise<{ type: string; payload?: unknown }> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('No active service worker to send message to');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = event => {
        resolve(event.data);
      };

      messageChannel.port1.addEventListener('messageerror', error => {
        reject(error);
      });

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(message, [
          messageChannel.port2,
        ]);
      } else {
        reject(new Error('No service worker controller available'));
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Service Worker message timeout'));
      }, 10000);
    });
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Online/offline status
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notifyStateChange();
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.notifyStateChange();
    });

    // Service worker controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      this.state.isControlling = !!navigator.serviceWorker.controller;
      this.notifyStateChange();

      logger.info('Service Worker controller changed');
    });
  }

  /**
   * Setup registration-specific event listeners
   */
  private setupRegistrationEventListeners(): void {
    if (!this.registration) {
      return;
    }

    // Update available
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration?.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            this.state.updateAvailable = true;
            this.notifyStateChange();

            logger.info('Service Worker update available');
          }
        });
      }
    });
  }

  /**
   * Start periodic update checks
   */
  private startUpdateCheck(): void {
    if (this.updateCheckTimer) {
      return;
    }

    this.updateCheckTimer = setInterval(() => {
      this.update().catch(error => {
        logger.error('Scheduled update check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }, this.config.updateCheckInterval);
  }

  /**
   * Stop periodic update checks
   */
  private stopUpdateCheck(): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
      this.updateCheckTimer = null;
    }
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        logger.error('Service Worker state listener error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  /**
   * Destroy service worker manager
   */
  destroy(): void {
    this.stopUpdateCheck();
    this.listeners.clear();

    // Remove event listeners
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});

    logger.info('Service Worker manager destroyed');
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-register service worker in production
if (import.meta.env.PROD) {
  serviceWorkerManager.register().catch(error => {
    logger.error('Auto service worker registration failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}
