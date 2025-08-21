import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../apiClient';

// Mock fetch
global.fetch = vi.fn();

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    // Create client with no retries to avoid timeout issues in tests
    client = new ApiClient({ retries: 0, retryDelay: 0 });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should make GET request successfully', async () => {
      const mockData = { message: 'success' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.get('/test');
      expect(result.data).toEqual(mockData);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeTypeOf('number');
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
    });

    it('should handle GET request errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(client.get('/invalid')).rejects.toThrow();
    });
  });

  describe('post', () => {
    it('should make POST request successfully', async () => {
      const mockData = { id: 1, name: 'test' };
      const requestData = { name: 'test' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.post('/test', requestData);
      expect(result.data).toEqual(mockData);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeTypeOf('number');
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: expect.any(AbortSignal),
      });
    });

    it('should handle POST request without body', async () => {
      const mockData = { message: 'created' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.post('/test');
      expect(result.data).toEqual(mockData);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeTypeOf('number');
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('put', () => {
    it('should make PUT request successfully', async () => {
      const mockData = { id: 1, name: 'updated' };
      const requestData = { name: 'updated' };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await client.put('/test/1', requestData);
      expect(result.data).toEqual(mockData);
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeTypeOf('number');
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/test/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('delete', () => {
    it('should make DELETE request successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await client.delete('/test/1');
      expect(result.data).toEqual({ success: true });
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeTypeOf('number');
      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/test/1', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('error handling', () => {
    it.skip('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.get('/test')).rejects.toThrow('Network error');
    });

    it.skip('should handle non-JSON responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(client.get('/test')).rejects.toThrow('Invalid JSON');
    });
  });
});
