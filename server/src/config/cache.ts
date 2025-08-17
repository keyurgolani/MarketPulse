/**
 * Cache Configuration
 * Centralized configuration for caching strategies, TTL management, and performance optimization
 */

export interface CacheConfig {
  // Default TTL values in seconds
  defaultTTL: {
    assets: number;
    historical: number;
    news: number;
    search: number;
    metadata: number;
  };

  // Adaptive TTL configuration
  adaptiveTTL: {
    enabled: boolean;
    rateLimitExtensionFactor: number; // Multiply TTL by this factor when rate limited
    maxTTL: number; // Maximum TTL in seconds
    minTTL: number; // Minimum TTL in seconds
  };

  // Cache warming configuration
  warming: {
    enabled: boolean;
    refreshThreshold: number; // Refresh when TTL is at this percentage (0.8 = 80%)
    maxConcurrentWarming: number;
    retryAttempts: number;
    retryDelay: number; // milliseconds
  };

  // Background refresh configuration
  backgroundRefresh: {
    enabled: boolean;
    interval: number; // milliseconds
    batchSize: number;
    priorityKeys: string[]; // Keys to refresh first
  };

  // Cache invalidation configuration
  invalidation: {
    patterns: {
      assets: string[];
      news: string[];
      all: string[];
    };
    triggers: {
      timeBasedEnabled: boolean;
      eventBasedEnabled: boolean;
      manualEnabled: boolean;
    };
  };

  // Performance monitoring
  monitoring: {
    enabled: boolean;
    metricsRetention: number; // days
    alertThresholds: {
      hitRateBelow: number; // percentage
      responseTimeAbove: number; // milliseconds
      errorRateAbove: number; // percentage
    };
  };

  // Memory management
  memory: {
    maxSize: number; // bytes
    evictionPolicy: 'lru' | 'lfu' | 'ttl';
    cleanupInterval: number; // milliseconds
  };
}

export const cacheConfig: CacheConfig = {
  defaultTTL: {
    assets: 300, // 5 minutes - frequent updates needed
    historical: 3600, // 1 hour - less frequent updates
    news: 900, // 15 minutes - moderate update frequency
    search: 1800, // 30 minutes - search results can be cached longer
    metadata: 7200, // 2 hours - metadata changes infrequently
  },

  adaptiveTTL: {
    enabled: true,
    rateLimitExtensionFactor: 2.0, // Double TTL when rate limited
    maxTTL: 14400, // 4 hours maximum
    minTTL: 60, // 1 minute minimum
  },

  warming: {
    enabled: true,
    refreshThreshold: 0.8, // Refresh at 80% of TTL
    maxConcurrentWarming: 5,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  backgroundRefresh: {
    enabled: true,
    interval: 60000, // 1 minute
    batchSize: 10,
    priorityKeys: [
      'assets:popular',
      'assets:trending',
      'news:breaking',
      'market:summary',
    ],
  },

  invalidation: {
    patterns: {
      assets: ['assets:*', 'market:*'],
      news: ['news:*', 'articles:*'],
      all: ['*'],
    },
    triggers: {
      timeBasedEnabled: true,
      eventBasedEnabled: true,
      manualEnabled: true,
    },
  },

  monitoring: {
    enabled: true,
    metricsRetention: 7, // 7 days
    alertThresholds: {
      hitRateBelow: 70, // Alert if hit rate below 70%
      responseTimeAbove: 500, // Alert if response time above 500ms
      errorRateAbove: 5, // Alert if error rate above 5%
    },
  },

  memory: {
    maxSize: 100 * 1024 * 1024, // 100MB
    evictionPolicy: 'lru',
    cleanupInterval: 60000, // 1 minute
  },
};

/**
 * Get TTL for specific data type with adaptive adjustment
 */
export function getTTL(
  dataType: keyof CacheConfig['defaultTTL'],
  isRateLimited: boolean = false,
  customTTL?: number
): number {
  let ttl = customTTL || cacheConfig.defaultTTL[dataType];

  // Apply adaptive TTL if rate limited
  if (isRateLimited && cacheConfig.adaptiveTTL.enabled) {
    ttl = Math.min(
      ttl * cacheConfig.adaptiveTTL.rateLimitExtensionFactor,
      cacheConfig.adaptiveTTL.maxTTL
    );
  }

  // Ensure TTL is within bounds
  return Math.max(
    Math.min(ttl, cacheConfig.adaptiveTTL.maxTTL),
    cacheConfig.adaptiveTTL.minTTL
  );
}

/**
 * Get cache key patterns for invalidation
 */
export function getInvalidationPatterns(
  type: keyof CacheConfig['invalidation']['patterns']
): string[] {
  return cacheConfig.invalidation.patterns[type];
}

/**
 * Check if cache warming should be triggered
 */
export function shouldWarmCache(
  currentTTL: number,
  originalTTL: number
): boolean {
  if (!cacheConfig.warming.enabled) {
    return false;
  }

  const remainingPercentage = currentTTL / originalTTL;
  return remainingPercentage <= 1 - cacheConfig.warming.refreshThreshold;
}

/**
 * Get background refresh configuration
 */
export function getBackgroundRefreshConfig(): CacheConfig['backgroundRefresh'] {
  return cacheConfig.backgroundRefresh;
}

/**
 * Check if monitoring is enabled
 */
export function isMonitoringEnabled(): boolean {
  return cacheConfig.monitoring.enabled;
}

/**
 * Get monitoring alert thresholds
 */
export function getAlertThresholds(): CacheConfig['monitoring']['alertThresholds'] {
  return cacheConfig.monitoring.alertThresholds;
}
