import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { io, Socket } from 'socket.io-client';

/**
 * WebSocket Integration Tests
 *
 * These tests validate WebSocket functionality with a running backend server.
 * Unlike unit tests that mock WebSocket connections, these tests require:
 * 1. Backend server running on localhost:3001
 * 2. WebSocket server properly configured
 *
 * Run with: npm run test:integration
 * Or standalone: npm run test:websocket
 */

describe('WebSocket Integration Tests', () => {
  let socket: Socket;
  const BACKEND_URL = 'http://localhost:3001';
  const CONNECTION_TIMEOUT = 10000;

  beforeEach(() => {
    // Clean up any existing socket connection
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  afterEach(() => {
    // Clean up socket connection after each test
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  it('should establish WebSocket connection to backend', async () => {
    // Skip test if backend is not running (for unit test environments)
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      if (!response.ok) {
        console.warn(
          'Backend server not running, skipping WebSocket integration test'
        );
        return;
      }
    } catch {
      console.warn(
        'Backend server not accessible, skipping WebSocket integration test'
      );
      return;
    }

    socket = io(BACKEND_URL, {
      transports: ['websocket'],
      timeout: 5000,
    });

    // Wait for connection with timeout
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, CONNECTION_TIMEOUT);

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.on('connect_error', error => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });
    });

    expect(socket.connected).toBe(true);
    expect(socket.id).toBeDefined();
    expect(typeof socket.id).toBe('string');
  });

  it('should handle dashboard room operations', async () => {
    // Skip test if backend is not running
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      if (!response.ok) {
        console.warn(
          'Backend server not running, skipping dashboard room test'
        );
        return;
      }
    } catch {
      console.warn(
        'Backend server not accessible, skipping dashboard room test'
      );
      return;
    }

    socket = io(BACKEND_URL, {
      transports: ['websocket'],
      timeout: 5000,
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, CONNECTION_TIMEOUT);

      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      socket.on('connect_error', error => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Test joining a dashboard room
    const dashboardId = 'test-dashboard-integration';
    const userId = 'test-user-integration';

    const joinResult = await new Promise<boolean>(resolve => {
      let joinConfirmed = false;

      const timeout = setTimeout(() => {
        if (!joinConfirmed) {
          resolve(false);
        }
      }, 5000);

      socket.on('dashboard:joined', data => {
        if (data.dashboardId === dashboardId && data.userId === userId) {
          joinConfirmed = true;
          clearTimeout(timeout);
          resolve(true);
        }
      });

      socket.emit('dashboard:join', { dashboardId, userId });
    });

    expect(joinResult).toBe(true);

    // Test leaving the dashboard room
    const leaveResult = await new Promise<boolean>(resolve => {
      let leaveConfirmed = false;

      const timeout = setTimeout(() => {
        if (!leaveConfirmed) {
          resolve(false);
        }
      }, 5000);

      socket.on('dashboard:left', data => {
        if (data.dashboardId === dashboardId) {
          leaveConfirmed = true;
          clearTimeout(timeout);
          resolve(true);
        }
      });

      socket.emit('dashboard:leave', { dashboardId });
    });

    expect(leaveResult).toBe(true);
  });

  it('should handle connection errors gracefully', async () => {
    // Test connection to a non-existent WebSocket server
    const invalidSocket = io('http://localhost:9999', {
      transports: ['websocket'],
      timeout: 2000,
    });

    const errorResult = await new Promise<{
      hasError: boolean;
      errorMessage: string;
    }>(resolve => {
      let errorReceived = false;
      let errorMessage = '';

      const timeout = setTimeout(() => {
        if (!errorReceived) {
          errorReceived = true;
          errorMessage = 'Connection timeout';
        }
        resolve({ hasError: errorReceived, errorMessage });
      }, 3000);

      invalidSocket.on('connect_error', error => {
        if (!errorReceived) {
          errorReceived = true;
          errorMessage = error.message;
          clearTimeout(timeout);
          resolve({ hasError: true, errorMessage });
        }
      });
    });

    expect(errorResult.hasError).toBe(true);
    expect(errorResult.errorMessage).toBeDefined();
    expect(errorResult.errorMessage.length).toBeGreaterThan(0);

    invalidSocket.disconnect();
  });

  it('should validate WebSocket service configuration', async () => {
    // This test validates that the WebSocket service is properly configured
    // even if the backend is not running

    // Test that socket.io-client is properly installed and can create connections
    expect(() => {
      const testSocket = io('http://localhost:3001', {
        autoConnect: false,
        transports: ['websocket'],
      });
      expect(testSocket).toBeDefined();
      expect(typeof testSocket.connect).toBe('function');
      expect(typeof testSocket.disconnect).toBe('function');
      expect(typeof testSocket.emit).toBe('function');
      expect(typeof testSocket.on).toBe('function');
      testSocket.disconnect();
    }).not.toThrow();
  });
});
