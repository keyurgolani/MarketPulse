import { describe, it, expect, beforeEach } from 'vitest';
import { useApiStore } from '../apiStore';

describe('apiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useApiStore.setState({
      requests: new Map(),
      cache: new Map(),
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useApiStore.getState();

      expect(state.requests).toBeInstanceOf(Map);
      expect(state.cache).toBeInstanceOf(Map);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      const { setLoading } = useApiStore.getState();

      setLoading(true);
      expect(useApiStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(useApiStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error state', () => {
      const { setError } = useApiStore.getState();
      const error = new Error('Test error');

      setError(error);
      expect(useApiStore.getState().error).toBe(error);

      setError(null);
      expect(useApiStore.getState().error).toBeNull();
    });
  });

  describe('addRequest', () => {
    it('should add request to store', () => {
      const { addRequest } = useApiStore.getState();
      const requestId = 'test-request';
      const timestamp = Date.now();
      const requestData = {
        url: '/api/test',
        method: 'GET',
        timestamp,
        status: 'pending' as const,
      };

      addRequest(requestId, requestData);

      const state = useApiStore.getState();
      expect(state.requests.has(requestId)).toBe(true);

      const storedRequest = state.requests.get(requestId);
      expect(storedRequest).toBeDefined();
      expect(storedRequest?.url).toBe('/api/test');
      expect(storedRequest?.method).toBe('GET');
      expect(storedRequest?.status).toBe('pending');
      // Allow for small timing differences (within 10ms)
      expect(
        Math.abs((storedRequest?.timestamp || 0) - timestamp)
      ).toBeLessThan(10);
    });
  });

  describe('updateRequest', () => {
    it('should update existing request', () => {
      const { addRequest, updateRequest } = useApiStore.getState();
      const requestId = 'test-request';

      // Add initial request
      addRequest(requestId, {
        url: '/api/test',
        method: 'GET',
        timestamp: Date.now(),
        status: 'pending',
      });

      // Update request
      updateRequest(requestId, { status: 'success', data: { result: 'ok' } });

      const request = useApiStore.getState().requests.get(requestId);
      expect(request?.status).toBe('success');
      expect(request?.data).toEqual({ result: 'ok' });
    });

    it('should not update non-existent request', () => {
      const { updateRequest } = useApiStore.getState();

      updateRequest('non-existent', { status: 'success' });

      const state = useApiStore.getState();
      expect(state.requests.has('non-existent')).toBe(false);
    });
  });

  describe('removeRequest', () => {
    it('should remove request from store', () => {
      const { addRequest, removeRequest } = useApiStore.getState();
      const requestId = 'test-request';

      // Add request
      addRequest(requestId, {
        url: '/api/test',
        method: 'GET',
        timestamp: Date.now(),
        status: 'pending',
      });

      expect(useApiStore.getState().requests.has(requestId)).toBe(true);

      // Remove request
      removeRequest(requestId);

      expect(useApiStore.getState().requests.has(requestId)).toBe(false);
    });
  });

  describe('setCache', () => {
    it('should set cache entry', () => {
      const { setCache } = useApiStore.getState();
      const cacheKey = 'test-cache';
      const cacheData = {
        data: { result: 'cached' },
        timestamp: Date.now(),
        ttl: 300000,
      };

      setCache(cacheKey, cacheData);

      const state = useApiStore.getState();
      expect(state.cache.has(cacheKey)).toBe(true);
      expect(state.cache.get(cacheKey)).toEqual(cacheData);
    });
  });

  describe('getCache', () => {
    it('should get valid cache entry', () => {
      const { setCache, getCache } = useApiStore.getState();
      const cacheKey = 'test-cache';
      const cacheData = {
        data: { result: 'cached' },
        timestamp: Date.now(),
        ttl: 300000, // 5 minutes
      };

      setCache(cacheKey, cacheData);

      const result = getCache(cacheKey);
      expect(result).toEqual(cacheData.data);
    });

    it('should return null for expired cache entry', () => {
      const { setCache, getCache } = useApiStore.getState();
      const cacheKey = 'test-cache';
      const cacheData = {
        data: { result: 'cached' },
        timestamp: Date.now() - 400000, // 6+ minutes ago
        ttl: 300000, // 5 minutes TTL
      };

      setCache(cacheKey, cacheData);

      const result = getCache(cacheKey);
      expect(result).toBeNull();
    });

    it('should return null for non-existent cache entry', () => {
      const { getCache } = useApiStore.getState();

      const result = getCache('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      const { setCache, clearCache } = useApiStore.getState();

      // Add multiple cache entries
      setCache('cache1', { data: 'data1', timestamp: Date.now(), ttl: 300000 });
      setCache('cache2', { data: 'data2', timestamp: Date.now(), ttl: 300000 });

      expect(useApiStore.getState().cache.size).toBe(2);

      clearCache();

      expect(useApiStore.getState().cache.size).toBe(0);
    });
  });

  describe('getRequestsByStatus', () => {
    it('should filter requests by status', () => {
      const { addRequest, getRequestsByStatus } = useApiStore.getState();

      // Add requests with different statuses
      addRequest('req1', {
        url: '/api/1',
        method: 'GET',
        timestamp: Date.now(),
        status: 'pending',
      });
      addRequest('req2', {
        url: '/api/2',
        method: 'GET',
        timestamp: Date.now(),
        status: 'success',
      });
      addRequest('req3', {
        url: '/api/3',
        method: 'GET',
        timestamp: Date.now(),
        status: 'pending',
      });

      const pendingRequests = getRequestsByStatus('pending');
      const successRequests = getRequestsByStatus('success');

      expect(pendingRequests).toHaveLength(2);
      expect(successRequests).toHaveLength(1);
    });
  });

  describe('getPendingRequests', () => {
    it('should return only pending requests', () => {
      const { addRequest, getPendingRequests } = useApiStore.getState();

      addRequest('req1', {
        url: '/api/1',
        method: 'GET',
        timestamp: Date.now(),
        status: 'pending',
      });
      addRequest('req2', {
        url: '/api/2',
        method: 'GET',
        timestamp: Date.now(),
        status: 'success',
      });
      addRequest('req3', {
        url: '/api/3',
        method: 'GET',
        timestamp: Date.now(),
        status: 'error',
      });

      const pendingRequests = getPendingRequests();

      expect(pendingRequests).toHaveLength(1);
      expect(pendingRequests[0].status).toBe('pending');
    });
  });
});
