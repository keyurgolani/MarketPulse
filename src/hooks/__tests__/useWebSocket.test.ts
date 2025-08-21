import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock socket.io-client BEFORE any imports that might use it
const mockSocket = {
  connected: false,
  id: 'mock-socket-id',
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
};

const mockIo = vi.fn(() => mockSocket);

vi.mock('socket.io-client', () => ({
  io: mockIo,
}));

// Mock logger BEFORE any imports that might use it
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock webSocketService BEFORE importing useWebSocket
vi.mock('../../services/webSocketService', () => {
  const mockService = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    reconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(false),
    getCurrentDashboardId: vi.fn().mockReturnValue(null),
    getCurrentUserId: vi.fn().mockReturnValue(null),
    joinDashboard: vi.fn(),
    leaveDashboard: vi.fn(),
    broadcastDashboardChange: vi.fn(),
    broadcastUserActivity: vi.fn(),
    broadcastWidgetEditing: vi.fn(),
    broadcastCursorPosition: vi.fn(),
    updatePresence: vi.fn(),
    setEventHandlers: vi.fn(),
    removeEventHandlers: vi.fn(),
  };

  return {
    webSocketService: mockService,
    WebSocketService: vi.fn().mockImplementation(() => mockService),
  };
});

// Import useWebSocket AFTER all mocks are set up
import { useWebSocket } from '../useWebSocket';

describe('useWebSocket', () => {
  let webSocketService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the mocked service
    const module = await import('../../services/webSocketService');
    webSocketService = module.webSocketService;
    // Reset mock implementations
    webSocketService.isConnected.mockReturnValue(false);
    webSocketService.getCurrentDashboardId.mockReturnValue(null);
    webSocketService.getCurrentUserId.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.currentDashboardId).toBeNull();
    expect(result.current.currentUserId).toBeNull();
  });

  it('should connect to WebSocket', async () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    await act(async () => {
      await result.current.connect();
    });

    expect(webSocketService.connect).toHaveBeenCalled();
  });

  it('should handle connection errors', async () => {
    const mockError = new Error('Connection failed');
    (webSocketService.connect as any).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    await act(async () => {
      try {
        await result.current.connect();
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.isConnected).toBe(false);
  });

  it('should disconnect WebSocket', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.disconnect();
    });

    expect(webSocketService.disconnect).toHaveBeenCalled();
  });

  it('should join dashboard', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.joinDashboard('dashboard-1', 'user-1');
    });

    expect(webSocketService.joinDashboard).toHaveBeenCalledWith(
      'dashboard-1',
      'user-1'
    );
  });

  it('should leave dashboard', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.leaveDashboard();
    });

    expect(webSocketService.leaveDashboard).toHaveBeenCalled();
  });

  it('should broadcast dashboard change', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
    const change = {
      type: 'dashboard_updated' as const,
      dashboardId: 'dashboard-1',
      userId: 'user-1',
      timestamp: Date.now(),
    };

    act(() => {
      result.current.broadcastDashboardChange(change);
    });

    expect(webSocketService.broadcastDashboardChange).toHaveBeenCalledWith(
      change
    );
  });

  it('should broadcast user activity', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.broadcastUserActivity('editing', 'widget-1');
    });

    expect(webSocketService.broadcastUserActivity).toHaveBeenCalledWith(
      'editing',
      'widget-1'
    );
  });

  it('should broadcast widget editing', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.broadcastWidgetEditing('widget-1', 'start');
    });

    expect(webSocketService.broadcastWidgetEditing).toHaveBeenCalledWith(
      'widget-1',
      'start'
    );
  });

  it('should broadcast cursor position', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));
    const position = { x: 100, y: 200 };

    act(() => {
      result.current.broadcastCursorPosition(position, 'widget-1');
    });

    expect(webSocketService.broadcastCursorPosition).toHaveBeenCalledWith(
      position,
      'widget-1'
    );
  });

  it('should update presence', () => {
    const { result } = renderHook(() => useWebSocket({ autoConnect: false }));

    act(() => {
      result.current.updatePresence();
    });

    expect(webSocketService.updatePresence).toHaveBeenCalled();
  });

  it('should set event handlers on mount', () => {
    renderHook(() => useWebSocket({ autoConnect: false }));

    expect(webSocketService.setEventHandlers).toHaveBeenCalled();
  });

  it('should remove event handlers on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket({ autoConnect: false }));

    unmount();

    expect(webSocketService.removeEventHandlers).toHaveBeenCalled();
  });

  it('should auto-connect when autoConnect is true', async () => {
    renderHook(() => useWebSocket({ autoConnect: true }));

    // Wait for useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(webSocketService.connect).toHaveBeenCalled();
  });

  it('should not auto-connect when autoConnect is false', async () => {
    renderHook(() => useWebSocket({ autoConnect: false }));

    // Wait for useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(webSocketService.connect).not.toHaveBeenCalled();
  });
});
