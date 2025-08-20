/**
 * Enhanced Local Storage Service
 * Provides robust local storage with versioning, conflict resolution, and offline support
 */

import { logger } from '@/utils/logger';

export interface StorageEntry<T> {
  data: T;
  version: number;
  timestamp: number;
  lastModified: number;
  checksum: string;
  isOffline?: boolean;
  conflictResolution?: 'local' | 'server' | 'merge';
}

export interface ConflictInfo {
  localVersion: number;
  serverVersion: number;
  localTimestamp: number;
  serverTimestamp: number;
  hasConflict: boolean;
}

export interface SyncStatus {
  lastSync: number;
  pendingChanges: number;
  isOnline: boolean;
  conflicts: string[];
}

class LocalStorageService {
  private readonly prefix = 'marketpulse_';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;
  private _isAvailable: boolean | null = null;

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get storage key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Check if localStorage is available
   */
  private isStorageAvailable(): boolean {
    // Cache the result to avoid repeated checks
    if (this._isAvailable !== null) {
      return this._isAvailable;
    }

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        this._isAvailable = false;
        return false;
      }

      // Check if localStorage exists and is accessible
      if (!window.localStorage) {
        this._isAvailable = false;
        return false;
      }

      // Use window.localStorage instead of global localStorage to be more explicit
      const storage = window.localStorage;

      // Check if localStorage has the expected methods
      if (
        typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function' ||
        typeof storage.removeItem !== 'function'
      ) {
        this._isAvailable = false;
        return false;
      }

      // Test basic functionality without accessing length directly
      try {
        const test = '__storage_test__';
        storage.setItem(test, test);
        const retrieved = storage.getItem(test);
        storage.removeItem(test);

        if (retrieved !== test) {
          this._isAvailable = false;
          return false;
        }

        this._isAvailable = true;
        return true;
      } catch {
        // If any localStorage operation fails, it's not available
        this._isAvailable = false;
        return false;
      }
    } catch {
      this._isAvailable = false;
      return false;
    }
  }

  /**
   * Set item with retry logic
   */
  private async setItemWithRetry(
    key: string,
    value: string,
    retries = 0
  ): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      if (retries < this.maxRetries) {
        logger.warn(
          `LocalStorage set failed, retrying (${retries + 1}/${this.maxRetries})`,
          {
            key,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        );

        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.setItemWithRetry(key, value, retries + 1);
      }

      logger.error('LocalStorage set failed after retries', {
        key,
        retries,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get item with error handling
   */
  private getItemSafe(key: string): string | null {
    try {
      // Check if localStorage is available before accessing it
      if (!this.isStorageAvailable()) {
        return null;
      }

      // Use window.localStorage explicitly with minimal error handling
      return window.localStorage.getItem(key);
    } catch {
      // Silently fail and return null to prevent console errors
      return null;
    }
  }

  /**
   * Set data with versioning and integrity checks
   */
  async set<T>(key: string, data: T, version?: number): Promise<void> {
    if (!this.isStorageAvailable()) {
      logger.warn('LocalStorage not available, skipping set operation', {
        key,
      });
      return;
    }

    try {
      const timestamp = Date.now();
      const checksum = this.generateChecksum(data);

      const entry: StorageEntry<T> = {
        data,
        version: version ?? timestamp,
        timestamp,
        lastModified: timestamp,
        checksum,
      };

      const serialized = JSON.stringify(entry);
      await this.setItemWithRetry(this.getKey(key), serialized);

      logger.debug('LocalStorage set successful', {
        key,
        version: entry.version,
        checksum,
        size: serialized.length,
      });
    } catch (error) {
      logger.error('LocalStorage set failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get data with integrity verification
   */
  async get<T>(key: string): Promise<StorageEntry<T> | null> {
    if (!this.isStorageAvailable()) {
      logger.warn('LocalStorage not available, returning null', { key });
      return null;
    }

    try {
      const serialized = this.getItemSafe(this.getKey(key));
      if (!serialized) {
        return null;
      }

      const entry: StorageEntry<T> = JSON.parse(serialized);

      // Verify data integrity
      const expectedChecksum = this.generateChecksum(entry.data);
      if (entry.checksum !== expectedChecksum) {
        logger.warn('LocalStorage data integrity check failed', {
          key,
          expectedChecksum,
          actualChecksum: entry.checksum,
        });

        // Remove corrupted data
        await this.remove(key);
        return null;
      }

      logger.debug('LocalStorage get successful', {
        key,
        version: entry.version,
        age: Date.now() - entry.timestamp,
      });

      return entry;
    } catch {
      // Silently fail and return null to prevent console errors
      return null;
    }
  }

  /**
   * Remove item from storage
   */
  async remove(key: string): Promise<void> {
    if (!this.isStorageAvailable()) {
      return;
    }

    try {
      window.localStorage.removeItem(this.getKey(key));
      logger.debug('LocalStorage remove successful', { key });
    } catch (error) {
      logger.error('LocalStorage remove failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isStorageAvailable()) {
      return false;
    }

    return this.getItemSafe(this.getKey(key)) !== null;
  }

  /**
   * Get all keys with prefix
   */
  async keys(pattern?: string): Promise<string[]> {
    // Early return if localStorage is not available
    if (!this.isStorageAvailable()) {
      return [];
    }

    try {
      const keys: string[] = [];
      const prefixLength = this.prefix.length;

      // Safe iteration over localStorage
      const storage = window.localStorage;

      // Use a safer approach to iterate over localStorage
      // Instead of relying on storage.length, use Object.keys if available
      try {
        // Try to get all keys using Object.keys approach first
        const allKeys = Object.keys(storage);
        for (const key of allKeys) {
          if (key.startsWith(this.prefix)) {
            const cleanKey = key.substring(prefixLength);
            if (!pattern || cleanKey.includes(pattern)) {
              keys.push(cleanKey);
            }
          }
        }
        return keys;
      } catch {
        // Fallback to traditional iteration if Object.keys fails
        try {
          // Additional safety check for storage.length
          if (typeof storage.length !== 'number' || storage.length < 0) {
            return [];
          }

          for (let i = 0; i < storage.length; i++) {
            try {
              const key = storage.key(i);
              if (key?.startsWith(this.prefix)) {
                const cleanKey = key.substring(prefixLength);
                if (!pattern || cleanKey.includes(pattern)) {
                  keys.push(cleanKey);
                }
              }
            } catch {
              // Skip this key if there's an error accessing it
              continue;
            }
          }
        } catch {
          // If both approaches fail, return empty array
          return [];
        }
      }

      return keys;
    } catch (error) {
      // Don't log localStorage errors in test environments to reduce noise
      if (import.meta.env.MODE !== 'test') {
        logger.error('LocalStorage keys enumeration failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      return [];
    }
  }

  /**
   * Clear all data with prefix
   */
  async clear(): Promise<void> {
    if (!this.isStorageAvailable()) {
      return;
    }

    try {
      const keys = await this.keys();
      for (const key of keys) {
        await this.remove(key);
      }

      logger.info('LocalStorage cleared', { keysRemoved: keys.length });
    } catch (error) {
      logger.error('LocalStorage clear failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{
    used: number;
    available: number;
    total: number;
    itemCount: number;
  }> {
    // Early return if localStorage is not available
    if (!this.isStorageAvailable()) {
      return { used: 0, available: 0, total: 0, itemCount: 0 };
    }

    try {
      let used = 0;
      let itemCount = 0;

      // Safe iteration over localStorage
      const storage = window.localStorage;

      // Use a safer approach to iterate over localStorage
      try {
        // Try to get all keys using Object.keys approach first
        const allKeys = Object.keys(storage);
        for (const key of allKeys) {
          if (key.startsWith(this.prefix)) {
            try {
              const value = storage.getItem(key);
              if (value) {
                used += key.length + value.length;
                itemCount++;
              }
            } catch {
              // Skip this key if there's an error accessing it
              continue;
            }
          }
        }
      } catch {
        // Fallback to traditional iteration if Object.keys fails
        try {
          // Additional safety check for storage.length
          if (typeof storage.length !== 'number' || storage.length < 0) {
            return { used: 0, available: 0, total: 0, itemCount: 0 };
          }

          for (let i = 0; i < storage.length; i++) {
            try {
              const key = storage.key(i);
              if (key?.startsWith(this.prefix)) {
                const value = storage.getItem(key);
                if (value) {
                  used += key.length + value.length;
                  itemCount++;
                }
              }
            } catch {
              // Skip this key if there's an error accessing it
              continue;
            }
          }
        } catch {
          // If both approaches fail, return safe defaults
          return { used: 0, available: 0, total: 0, itemCount: 0 };
        }
      }

      // Estimate total storage (typically 5-10MB in most browsers)
      const total = 5 * 1024 * 1024; // 5MB estimate
      const available = total - used;

      return { used, available, total, itemCount };
    } catch (error) {
      // Don't log localStorage errors in test environments to reduce noise
      if (import.meta.env.MODE !== 'test') {
        logger.error('Storage info calculation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      return { used: 0, available: 0, total: 0, itemCount: 0 };
    }
  }

  /**
   * Detect conflicts between local and server data
   */
  detectConflict<T>(
    localEntry: StorageEntry<T> | null,
    _serverData: T,
    serverVersion: number,
    serverTimestamp: number
  ): ConflictInfo {
    if (!localEntry) {
      return {
        localVersion: 0,
        serverVersion,
        localTimestamp: 0,
        serverTimestamp,
        hasConflict: false,
      };
    }

    const hasConflict =
      localEntry.version !== serverVersion &&
      localEntry.lastModified > serverTimestamp;

    return {
      localVersion: localEntry.version,
      serverVersion,
      localTimestamp: localEntry.lastModified,
      serverTimestamp,
      hasConflict,
    };
  }

  /**
   * Resolve conflicts using specified strategy
   */
  async resolveConflict<T>(
    key: string,
    localEntry: StorageEntry<T>,
    serverData: T,
    serverVersion: number,
    serverTimestamp: number,
    strategy: 'local' | 'server' | 'merge' = 'server'
  ): Promise<T> {
    logger.info('Resolving data conflict', {
      key,
      strategy,
      localVersion: localEntry.version,
      serverVersion,
      localTimestamp: localEntry.lastModified,
      serverTimestamp,
    });

    switch (strategy) {
      case 'local':
        // Keep local data, mark for server sync
        localEntry.conflictResolution = 'local';
        await this.set(key, localEntry.data, localEntry.version);
        return localEntry.data;

      case 'server':
        // Use server data, update local storage
        await this.set(key, serverData, serverVersion);
        return serverData;

      case 'merge': {
        // Attempt to merge data (implementation depends on data type)
        const mergedData = this.mergeData(localEntry.data, serverData);
        const mergedVersion = Math.max(localEntry.version, serverVersion) + 1;
        await this.set(key, mergedData, mergedVersion);
        return mergedData;
      }

      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }
  }

  /**
   * Merge data objects (basic implementation)
   */
  private mergeData<T>(localData: T, serverData: T): T {
    // Basic merge strategy - this should be customized based on data type
    if (typeof localData === 'object' && typeof serverData === 'object') {
      return { ...serverData, ...localData } as T;
    }

    // For non-objects, prefer server data
    return serverData;
  }

  /**
   * Mark data as offline/pending sync
   */
  async markOffline<T>(key: string, data: T): Promise<void> {
    const entry = await this.get<T>(key);
    const timestamp = Date.now();

    const offlineEntry: StorageEntry<T> = {
      data,
      version: entry?.version ?? timestamp,
      timestamp: entry?.timestamp ?? timestamp,
      lastModified: timestamp,
      checksum: this.generateChecksum(data),
      isOffline: true,
    };

    await this.set(key, data, offlineEntry.version);

    logger.info('Data marked as offline', {
      key,
      version: offlineEntry.version,
    });
  }

  /**
   * Get all offline/pending sync items
   */
  async getOfflineItems(): Promise<
    Array<{ key: string; entry: StorageEntry<unknown> }>
  > {
    const keys = await this.keys();
    const offlineItems: Array<{ key: string; entry: StorageEntry<unknown> }> =
      [];

    for (const key of keys) {
      const entry = await this.get(key);
      if (entry?.isOffline) {
        offlineItems.push({ key, entry });
      }
    }

    return offlineItems;
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      // Return safe defaults if localStorage is not available
      if (!this.isStorageAvailable()) {
        return {
          lastSync: 0,
          pendingChanges: 0,
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
          conflicts: [],
        };
      }

      // Additional safety check - if we're in SSR or localStorage is not ready, return defaults
      if (typeof window === 'undefined' || !window.localStorage) {
        return {
          lastSync: 0,
          pendingChanges: 0,
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
          conflicts: [],
        };
      }

      let offlineItems: Array<{ key: string; entry: StorageEntry<unknown> }> =
        [];
      let conflictKeys: string[] = [];

      // Skip complex localStorage operations if not available
      if (this.isStorageAvailable()) {
        try {
          const items = await this.getOfflineItems();
          offlineItems = Array.isArray(items) ? items : [];
        } catch {
          offlineItems = []; // Ensure it's always an array
        }

        try {
          const keys = await this.keys('conflict_');
          conflictKeys = Array.isArray(keys) ? keys : [];
        } catch {
          conflictKeys = []; // Ensure it's always an array
        }
      }

      let lastSync = 0;
      // Skip localStorage access entirely if not available to prevent errors
      if (this.isStorageAvailable()) {
        try {
          const lastSyncValue = window.localStorage.getItem(
            this.getKey('last_sync')
          );
          if (lastSyncValue !== null && lastSyncValue !== undefined) {
            const parsedValue = parseInt(lastSyncValue, 10);
            lastSync = isNaN(parsedValue) ? 0 : parsedValue;
          }
        } catch {
          // Silently fail and use default value
          lastSync = 0;
        }
      }

      return {
        lastSync: isNaN(lastSync) ? 0 : lastSync,
        pendingChanges: offlineItems?.length || 0,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
        conflicts: conflictKeys || [],
      };
    } catch (error) {
      // Catch any unexpected errors in getSyncStatus
      if (import.meta.env.MODE !== 'test') {
        logger.error('Unexpected error in getSyncStatus', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      }

      // Return safe defaults
      return {
        lastSync: 0,
        pendingChanges: 0,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
        conflicts: [],
      };
    }
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(): Promise<void> {
    // Multiple safety checks
    if (!this.isStorageAvailable()) {
      return;
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const timestamp = Date.now().toString();
      window.localStorage.setItem(this.getKey('last_sync'), timestamp);
    } catch (error) {
      // Don't log localStorage errors in test environments to reduce noise
      if (import.meta.env.MODE !== 'test') {
        logger.error('Failed to update last sync timestamp', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();
