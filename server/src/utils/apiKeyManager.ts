/**
 * API Key Manager
 * Manages multiple API keys with automatic rotation and health tracking
 */

import { logger } from './logger';

export interface ApiKeyStatus {
  key: string;
  isActive: boolean;
  lastUsed: Date | null;
  errorCount: number;
  rateLimitHits: number;
  lastError: string | null;
  healthScore: number; // 0-100, higher is better
}

export class ApiKeyManager {
  private keys: string[];
  private currentKeyIndex: number;
  private keyStatuses: Map<string, ApiKeyStatus>;
  private rotationThreshold: number;
  private maxErrorCount: number;

  constructor(
    keys: string[],
    rotationThreshold = 5, // Rotate after 5 rate limit hits
    maxErrorCount = 10 // Disable key after 10 consecutive errors
  ) {
    if (!keys || keys.length === 0) {
      throw new Error('At least one API key must be provided');
    }

    this.keys = keys.filter(
      key =>
        key &&
        key !== 'demo-key-1' &&
        key !== 'demo-key-2' &&
        key !== 'demo-key-3'
    );

    // If no valid keys after filtering, use demo keys for development
    if (this.keys.length === 0) {
      this.keys = keys;
      logger.warn(
        'Using demo API keys - replace with real keys for production'
      );
    }

    this.currentKeyIndex = 0;
    this.rotationThreshold = rotationThreshold;
    this.maxErrorCount = maxErrorCount;
    this.keyStatuses = new Map();

    // Initialize key statuses
    this.keys.forEach(key => {
      this.keyStatuses.set(key, {
        key,
        isActive: true,
        lastUsed: null,
        errorCount: 0,
        rateLimitHits: 0,
        lastError: null,
        healthScore: 100,
      });
    });

    logger.info('API Key Manager initialized', {
      totalKeys: this.keys.length,
      rotationThreshold,
      maxErrorCount,
    });
  }

  /**
   * Get the current active API key
   */
  getCurrentKey(): string {
    const activeKeys = this.getActiveKeys();

    if (activeKeys.length === 0) {
      // Reset all keys if none are active
      this.resetAllKeys();
      logger.warn('All API keys were inactive, resetting all keys');
    }

    // Find the best key based on health score
    const bestKey = this.findBestKey();
    if (bestKey) {
      this.currentKeyIndex = this.keys.indexOf(bestKey.key);
    }

    const currentKey = this.keys[this.currentKeyIndex];
    if (!currentKey) {
      throw new Error('No API keys available');
    }

    const status = this.keyStatuses.get(currentKey);

    if (status) {
      status.lastUsed = new Date();
      this.keyStatuses.set(currentKey, status);
    }

    return currentKey;
  }

  /**
   * Rotate to the next available API key
   */
  rotateKey(): string {
    const activeKeys = this.getActiveKeys();

    if (activeKeys.length <= 1) {
      logger.warn('Cannot rotate API key - only one key available');
      return this.getCurrentKey();
    }

    // Mark current key as having a rate limit hit
    const currentKey = this.keys[this.currentKeyIndex];
    if (!currentKey) {
      throw new Error('No current API key available for rotation');
    }
    this.recordRateLimitHit(currentKey);

    // Find next active key
    let nextIndex = (this.currentKeyIndex + 1) % this.keys.length;
    let attempts = 0;

    while (attempts < this.keys.length) {
      const nextKey = this.keys[nextIndex];
      if (!nextKey) {
        nextIndex = (nextIndex + 1) % this.keys.length;
        attempts++;
        continue;
      }

      const status = this.keyStatuses.get(nextKey);

      if (status?.isActive) {
        this.currentKeyIndex = nextIndex;
        logger.info('API key rotated', {
          fromKey: this.maskKey(currentKey),
          toKey: this.maskKey(nextKey),
          reason: 'rate_limit_hit',
        });
        return nextKey;
      }

      nextIndex = (nextIndex + 1) % this.keys.length;
      attempts++;
    }

    // If no active keys found, reset and use current
    this.resetAllKeys();
    logger.warn('No active API keys found during rotation, resetting all keys');
    return this.getCurrentKey();
  }

  /**
   * Record an error for the current API key
   */
  recordError(error: string): void {
    const currentKey = this.keys[this.currentKeyIndex];
    if (!currentKey) {
      logger.error('Cannot record error: no current API key available');
      return;
    }

    const status = this.keyStatuses.get(currentKey);

    if (status) {
      status.errorCount++;
      status.lastError = error;
      status.healthScore = Math.max(0, status.healthScore - 10);

      // Disable key if too many errors
      if (status.errorCount >= this.maxErrorCount) {
        status.isActive = false;
        logger.warn('API key disabled due to excessive errors', {
          key: this.maskKey(currentKey),
          errorCount: status.errorCount,
          lastError: error,
        });
      }

      this.keyStatuses.set(currentKey, status);
    }
  }

  /**
   * Record a successful request for the current API key
   */
  recordSuccess(): void {
    const currentKey = this.keys[this.currentKeyIndex];
    if (!currentKey) {
      logger.error('Cannot record success: no current API key available');
      return;
    }

    const status = this.keyStatuses.get(currentKey);

    if (status) {
      // Reset error count on success
      status.errorCount = 0;
      status.lastError = null;
      status.healthScore = Math.min(100, status.healthScore + 1);

      this.keyStatuses.set(currentKey, status);
    }
  }

  /**
   * Record a rate limit hit for a specific key
   */
  private recordRateLimitHit(key: string): void {
    const status = this.keyStatuses.get(key);

    if (status) {
      status.rateLimitHits++;
      status.healthScore = Math.max(0, status.healthScore - 5);

      // Temporarily disable key if too many rate limit hits
      if (status.rateLimitHits >= this.rotationThreshold) {
        status.isActive = false;

        // Re-enable after 5 minutes
        setTimeout(
          () => {
            const currentStatus = this.keyStatuses.get(key);
            if (currentStatus) {
              currentStatus.isActive = true;
              currentStatus.rateLimitHits = 0;
              currentStatus.healthScore = Math.min(
                100,
                currentStatus.healthScore + 20
              );
              this.keyStatuses.set(key, currentStatus);

              logger.info('API key re-enabled after cooldown', {
                key: this.maskKey(key),
              });
            }
          },
          5 * 60 * 1000
        ); // 5 minutes

        logger.warn('API key temporarily disabled due to rate limiting', {
          key: this.maskKey(key),
          rateLimitHits: status.rateLimitHits,
        });
      }

      this.keyStatuses.set(key, status);
    }
  }

  /**
   * Get all active API keys
   */
  private getActiveKeys(): ApiKeyStatus[] {
    return Array.from(this.keyStatuses.values()).filter(
      status => status.isActive
    );
  }

  /**
   * Find the best API key based on health score
   */
  private findBestKey(): ApiKeyStatus | null {
    const activeKeys = this.getActiveKeys();

    if (activeKeys.length === 0) {
      return null;
    }

    return activeKeys.reduce((best, current) =>
      current.healthScore > best.healthScore ? current : best
    );
  }

  /**
   * Reset all API keys to active status
   */
  private resetAllKeys(): void {
    this.keyStatuses.forEach((status, key) => {
      status.isActive = true;
      status.errorCount = 0;
      status.rateLimitHits = 0;
      status.lastError = null;
      status.healthScore = 100;
      this.keyStatuses.set(key, status);
    });

    logger.info('All API keys reset to active status');
  }

  /**
   * Get status of all API keys
   */
  getKeyStatuses(): ApiKeyStatus[] {
    return Array.from(this.keyStatuses.values()).map(status => ({
      ...status,
      key: this.maskKey(status.key),
    }));
  }

  /**
   * Get statistics about API key usage
   */
  getStats(): {
    totalKeys: number;
    activeKeys: number;
    currentKey: string;
    rotationThreshold: number;
    maxErrorCount: number;
  } {
    return {
      totalKeys: this.keys.length,
      activeKeys: this.getActiveKeys().length,
      currentKey: this.maskKey(this.keys[this.currentKeyIndex] || 'none'),
      rotationThreshold: this.rotationThreshold,
      maxErrorCount: this.maxErrorCount,
    };
  }

  /**
   * Mask API key for logging (show only first 4 and last 4 characters)
   */
  private maskKey(key: string): string {
    if (key.length <= 8) {
      return '*'.repeat(key.length);
    }

    return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
  }

  /**
   * Manually disable a specific API key
   */
  disableKey(key: string): void {
    const status = this.keyStatuses.get(key);

    if (status) {
      status.isActive = false;
      this.keyStatuses.set(key, status);

      logger.info('API key manually disabled', {
        key: this.maskKey(key),
      });
    }
  }

  /**
   * Manually enable a specific API key
   */
  enableKey(key: string): void {
    const status = this.keyStatuses.get(key);

    if (status) {
      status.isActive = true;
      status.errorCount = 0;
      status.rateLimitHits = 0;
      status.lastError = null;
      status.healthScore = 100;
      this.keyStatuses.set(key, status);

      logger.info('API key manually enabled', {
        key: this.maskKey(key),
      });
    }
  }
}
