/**
 * Service Worker for MarketPulse
 * Provides offline caching, background sync, and performance optimization
 */

const CACHE_NAME = 'marketpulse-v1';
const STATIC_CACHE = 'marketpulse-static-v1';
const API_CACHE = 'marketpulse-api-v1';
const IMAGE_CACHE = 'marketpulse-images-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only',
};

// Cache configurations
const CACHE_CONFIG = {
  static: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 100,
  },
  api: {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 500,
  },
  images: {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 200,
  },
};

// URLs to cache on install
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/vite.svg'];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/assets/,
  /\/api\/news/,
  /\/api\/dashboards/,
  /\/api\/system\/health/,
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),

      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE &&
              cacheName !== API_CACHE &&
              cacheName !== IMAGE_CACHE
            ) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Claim all clients
      self.clients.claim(),
    ])
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine cache strategy based on request type
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'market-data-sync') {
    event.waitUntil(syncMarketData());
  } else if (event.tag === 'dashboard-sync') {
    event.waitUntil(syncDashboards());
  }
});

// Push notifications (for future use)
self.addEventListener('push', event => {
  console.log('Push notification received:', event);

  if (event.data) {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        data: data.data,
      })
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);

  event.notification.close();

  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/'));
});

// Message handler for communication with main thread
self.addEventListener('message', event => {
  console.log('Service Worker message received:', event.data);

  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_CACHE_STATS':
      getCacheStats().then(stats => {
        event.ports[0].postMessage({ type: 'CACHE_STATS', payload: stats });
      });
      break;

    case 'CLEAR_CACHE':
      clearCache(payload?.cacheType).then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
      });
      break;

    case 'PREFETCH_URLS':
      prefetchUrls(payload?.urls || []).then(() => {
        event.ports[0].postMessage({ type: 'PREFETCH_COMPLETE' });
      });
      break;
  }
});

// Helper functions

function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json') ||
    url.pathname === '/' ||
    url.pathname.startsWith('/assets/')
  );
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp')
  );
}

async function handleStaticAsset(request) {
  return handleCacheStrategy(request, STATIC_CACHE, CACHE_CONFIG.static);
}

async function handleApiRequest(request) {
  // Check if this API endpoint should be cached
  const url = new URL(request.url);
  const shouldCache = CACHEABLE_API_PATTERNS.some(pattern =>
    pattern.test(url.pathname)
  );

  if (shouldCache) {
    return handleCacheStrategy(request, API_CACHE, CACHE_CONFIG.api);
  } else {
    // For non-cacheable API requests, just fetch from network
    return fetch(request);
  }
}

async function handleImageRequest(request) {
  return handleCacheStrategy(request, IMAGE_CACHE, CACHE_CONFIG.images);
}

async function handleDefaultRequest(request) {
  // For other requests, try cache first, then network
  return handleCacheStrategy(request, CACHE_NAME, {
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    maxAge: 60 * 60 * 1000, // 1 hour
    maxEntries: 100,
  });
}

async function handleCacheStrategy(request, cacheName, config) {
  const cache = await caches.open(cacheName);

  switch (config.strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cache, config);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cache, config);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cache, config);

    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);

    case CACHE_STRATEGIES.CACHE_ONLY:
      return cache.match(request);

    default:
      return cacheFirst(request, cache, config);
  }
}

async function cacheFirst(request, cache, config) {
  try {
    const cachedResponse = await cache.match(request);

    if (cachedResponse && !isExpired(cachedResponse, config.maxAge)) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await cleanupCache(cache, config.maxEntries);
    }

    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cache, config) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      await cleanupCache(cache, config.maxEntries);
    }

    return networkResponse;
  } catch (error) {
    console.error('Network first strategy failed:', error);
    const cachedResponse = await cache.match(request);

    if (cachedResponse && !isExpired(cachedResponse, config.maxAge)) {
      return cachedResponse;
    }

    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, cache, config) {
  const cachedResponse = await cache.match(request);

  // Always try to fetch from network in background
  const networkResponsePromise = fetch(request)
    .then(async networkResponse => {
      if (networkResponse.ok) {
        const responseToCache = networkResponse.clone();
        await cache.put(request, responseToCache);
        await cleanupCache(cache, config.maxEntries);
      }
      return networkResponse;
    })
    .catch(error => {
      console.error('Background fetch failed:', error);
      return null;
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // If no cached response, wait for network
  return networkResponsePromise || new Response('Offline', { status: 503 });
}

function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return false;

  const responseDate = new Date(dateHeader);
  const now = new Date();

  return now.getTime() - responseDate.getTime() > maxAge;
}

async function cleanupCache(cache, maxEntries) {
  const keys = await cache.keys();

  if (keys.length > maxEntries) {
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

async function syncMarketData() {
  console.log('Syncing market data...');

  try {
    // Get offline queue from IndexedDB or localStorage
    const offlineActions = await getOfflineActions('market-data');

    for (const action of offlineActions) {
      try {
        await fetch(action.url, action.options);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Failed to sync market data action:', error);
      }
    }
  } catch (error) {
    console.error('Market data sync failed:', error);
  }
}

async function syncDashboards() {
  console.log('Syncing dashboards...');

  try {
    const offlineActions = await getOfflineActions('dashboard');

    for (const action of offlineActions) {
      try {
        await fetch(action.url, action.options);
        await removeOfflineAction(action.id);
      } catch (error) {
        console.error('Failed to sync dashboard action:', error);
      }
    }
  } catch (error) {
    console.error('Dashboard sync failed:', error);
  }
}

async function getOfflineActions(type) {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function removeOfflineAction(id) {
  // This would typically remove from IndexedDB
  console.log('Removing offline action:', id);
}

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      entryCount: keys.length,
      urls: keys.map(key => key.url),
    };
  }

  return stats;
}

async function clearCache(cacheType) {
  if (cacheType) {
    await caches.delete(cacheType);
  } else {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

async function prefetchUrls(urls) {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    urls.map(async url => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.error('Failed to prefetch URL:', url, error);
      }
    })
  );
}

console.log('Service Worker loaded');
