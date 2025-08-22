import { logger } from '../utils/logger';

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  lastOnline?: number;
  lastOffline?: number;
}

export interface OfflineQueueItem {
  id: string;
  type: 'subscription' | 'unsubscription' | 'data_request';
  data: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export class OfflineService {
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private offlineQueue: Map<string, OfflineQueueItem> = new Map();
  private networkStatus: NetworkStatus;
  private checkInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.networkStatus = {
      isOnline: this.isOnline,
      lastOnline: this.isOnline ? Date.now() : undefined,
    };

    this.setupEventListeners();
    this.startNetworkMonitoring();
  }

  /**
   * Set up network event listeners
   */
  private setupEventListeners(): void {
    // Standard online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Network Information API (if available)
    if ('connection' in navigator) {
      const connection = (
        navigator as {
          connection?: {
            addEventListener: (event: string, handler: () => void) => void;
          };
        }
      ).connection;
      if (connection) {
        connection.addEventListener(
          'change',
          this.handleConnectionChange.bind(this)
        );
        this.updateNetworkInfo();
      }
    }

    // Visibility change (to check connection when tab becomes visible)
    document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange.bind(this)
    );
  }

  /**
   * Start periodic network monitoring
   */
  private startNetworkMonitoring(): void {
    // Check connection every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, 30000);

    // Process offline queue every 10 seconds when online
    this.retryInterval = setInterval(() => {
      if (this.isOnline) {
        this.processOfflineQueue();
      }
    }, 10000);
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    logger.info('Network connection restored');
    this.isOnline = true;
    this.networkStatus.isOnline = true;
    this.networkStatus.lastOnline = Date.now();
    this.updateNetworkInfo();
    this.notifyListeners();
    this.processOfflineQueue();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    logger.warn('Network connection lost');
    this.isOnline = false;
    this.networkStatus.isOnline = false;
    this.networkStatus.lastOffline = Date.now();
    this.notifyListeners();
  }

  /**
   * Handle connection change (Network Information API)
   */
  private handleConnectionChange(): void {
    this.updateNetworkInfo();
    this.notifyListeners();
  }

  /**
   * Handle visibility change
   */
  private handleVisibilityChange(): void {
    if (!document.hidden) {
      // Tab became visible, check connection
      setTimeout(() => {
        this.checkConnection();
      }, 1000);
    }
  }

  /**
   * Update network information from Network Information API
   */
  private updateNetworkInfo(): void {
    if ('connection' in navigator) {
      const connection = (
        navigator as {
          connection?: {
            type?: string;
            effectiveType?: string;
            downlink?: number;
            rtt?: number;
          };
        }
      ).connection;
      if (connection) {
        this.networkStatus.connectionType = connection.type;
        this.networkStatus.effectiveType = connection.effectiveType;
        this.networkStatus.downlink = connection.downlink;
        this.networkStatus.rtt = connection.rtt;
      }
    }
  }

  /**
   * Check connection by making a lightweight request
   */
  private async checkConnection(): Promise<void> {
    try {
      // Try to fetch a small resource with no-cache
      const response = await fetch('/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });

      const wasOffline = !this.isOnline;
      this.isOnline = response.ok;

      if (this.isOnline && wasOffline) {
        this.handleOnline();
      } else if (!this.isOnline && !wasOffline) {
        this.handleOffline();
      }
    } catch {
      const wasOnline = this.isOnline;
      this.isOnline = false;

      if (wasOnline) {
        this.handleOffline();
      }
    }
  }

  /**
   * Add listener for network status changes
   */
  addListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove listener for network status changes
   */
  removeListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.networkStatus);
      } catch (err) {
        logger.error('Error in network status listener:', {
          error: String(err),
        });
      }
    });
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Check if currently online
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Add item to offline queue
   */
  queueOfflineAction(
    type: OfflineQueueItem['type'],
    data: unknown,
    maxRetries: number = 3
  ): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const item: OfflineQueueItem = {
      id,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.offlineQueue.set(id, item);

    logger.info('Added item to offline queue', {
      id,
      type,
      queueSize: this.offlineQueue.size,
    });

    return id;
  }

  /**
   * Remove item from offline queue
   */
  removeFromQueue(id: string): boolean {
    const removed = this.offlineQueue.delete(id);
    if (removed) {
      logger.debug('Removed item from offline queue', { id });
    }
    return removed;
  }

  /**
   * Get offline queue items
   */
  getQueuedItems(): OfflineQueueItem[] {
    return Array.from(this.offlineQueue.values());
  }

  /**
   * Process offline queue when connection is restored
   */
  private async processOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.offlineQueue.size === 0) {
      return;
    }

    logger.info('Processing offline queue', {
      queueSize: this.offlineQueue.size,
    });

    const items = Array.from(this.offlineQueue.values());

    for (const item of items) {
      try {
        await this.processQueueItem(item);
        this.offlineQueue.delete(item.id);

        logger.debug('Successfully processed offline queue item', {
          id: item.id,
          type: item.type,
        });
      } catch (error) {
        item.retryCount++;

        if (item.retryCount >= item.maxRetries) {
          this.offlineQueue.delete(item.id);
          logger.error(
            'Failed to process offline queue item, max retries exceeded',
            {
              id: item.id,
              type: item.type,
              retryCount: item.retryCount,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          );
        } else {
          logger.warn('Failed to process offline queue item, will retry', {
            id: item.id,
            type: item.type,
            retryCount: item.retryCount,
            maxRetries: item.maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    // This method should be overridden or extended by specific implementations
    // For now, we'll emit a custom event that can be handled by other services

    const event = new CustomEvent('offline-queue-process', {
      detail: item,
    });

    window.dispatchEvent(event);

    // Wait a bit to allow event handlers to process
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Clear all queued items
   */
  clearQueue(): void {
    const size = this.offlineQueue.size;
    this.offlineQueue.clear();

    logger.info('Cleared offline queue', { clearedItems: size });
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    totalItems: number;
    itemsByType: Record<string, number>;
    oldestItem?: number;
    newestItem?: number;
  } {
    const items = Array.from(this.offlineQueue.values());
    const itemsByType: Record<string, number> = {};

    items.forEach(item => {
      itemsByType[item.type] = (itemsByType[item.type] || 0) + 1;
    });

    const timestamps = items.map(item => item.timestamp);

    return {
      totalItems: items.length,
      itemsByType,
      oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestItem: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
    };
  }

  /**
   * Destroy the service and clean up resources
   */
  destroy(): void {
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange.bind(this)
    );

    if ('connection' in navigator) {
      const connection = (
        navigator as {
          connection?: {
            removeEventListener: (event: string, handler: () => void) => void;
          };
        }
      ).connection;
      if (connection) {
        connection.removeEventListener(
          'change',
          this.handleConnectionChange.bind(this)
        );
      }
    }

    // Clear intervals
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    // Clear listeners and queue
    this.listeners.clear();
    this.offlineQueue.clear();

    logger.info('Offline service destroyed');
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
