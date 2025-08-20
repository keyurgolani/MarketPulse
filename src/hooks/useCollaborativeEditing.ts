/**
 * Collaborative Editing Hook
 * Manages real-time collaborative editing features
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import type {
  UserActivityEvent,
  WidgetEditingEvent,
  CursorPositionEvent,
} from '../services/webSocketService';
import { logger } from '../utils/logger';

export interface CollaborativeEditingOptions {
  dashboardId: string;
  userId: string;
  enableCursorTracking?: boolean;
  enableActivityTracking?: boolean;
  cursorThrottleMs?: number;
}

export interface EditingSession {
  userId: string;
  widgetId: string;
  startTime: number;
  lastActivity: number;
}

export interface UserActivity {
  userId: string;
  action: 'editing' | 'viewing' | 'configuring';
  widgetId?: string;
  timestamp: number;
}

export interface CursorPosition {
  userId: string;
  widgetId?: string;
  position: { x: number; y: number };
  timestamp: number;
}

export interface UseCollaborativeEditingReturn {
  // State
  editingSessions: EditingSession[];
  userActivities: UserActivity[];
  cursorPositions: CursorPosition[];
  isConnected: boolean;

  // Methods
  startEditingSession: (widgetId: string) => void;
  endEditingSession: (widgetId: string) => void;
  updateEditingActivity: (widgetId: string) => void;
  broadcastActivity: (
    action: UserActivity['action'],
    widgetId?: string
  ) => void;
  updateCursorPosition: (
    position: { x: number; y: number },
    widgetId?: string
  ) => void;

  // Getters
  getUsersEditingWidget: (widgetId: string) => EditingSession[];
  getRecentActivities: (maxAge?: number) => UserActivity[];
  getCursorPositions: (widgetId?: string) => CursorPosition[];
}

export function useCollaborativeEditing(
  options: CollaborativeEditingOptions
): UseCollaborativeEditingReturn {
  const {
    userId,
    enableCursorTracking = true,
    enableActivityTracking = true,
    cursorThrottleMs = 100,
  } = options;

  // State
  const [editingSessions, setEditingSessions] = useState<EditingSession[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [cursorPositions, setCursorPositions] = useState<CursorPosition[]>([]);

  // Refs for throttling
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorUpdate = useRef<number>(0);

  // WebSocket handlers
  const handleUserActivity = useCallback(
    (event: UserActivityEvent): void => {
      if (!enableActivityTracking || event.userId === userId) return;

      const activity: UserActivity = {
        userId: event.userId,
        action: event.action,
        widgetId: event.widgetId,
        timestamp: event.timestamp,
      };

      setUserActivities(prev => [activity, ...prev.slice(0, 49)]); // Keep last 50 activities
      logger.info('Received user activity:', { activity });
    },
    [enableActivityTracking, userId]
  );

  const handleWidgetEditing = useCallback(
    (event: WidgetEditingEvent): void => {
      if (event.userId === userId) return;

      const session: EditingSession = {
        userId: event.userId,
        widgetId: event.widgetId,
        startTime: event.timestamp,
        lastActivity: event.timestamp,
      };

      setEditingSessions(prev => {
        const filtered = prev.filter(
          s => !(s.userId === event.userId && s.widgetId === event.widgetId)
        );

        if (event.action === 'start') {
          return [...filtered, session];
        } else if (event.action === 'end') {
          return filtered;
        } else if (event.action === 'update') {
          const existing = prev.find(
            s => s.userId === event.userId && s.widgetId === event.widgetId
          );
          if (existing) {
            return prev.map(s =>
              s.userId === event.userId && s.widgetId === event.widgetId
                ? { ...s, lastActivity: event.timestamp }
                : s
            );
          }
          return [...filtered, session];
        }

        return filtered;
      });

      logger.info('Received widget editing event:', { event });
    },
    [userId]
  );

  const handleCursorPosition = useCallback(
    (event: CursorPositionEvent): void => {
      if (!enableCursorTracking || event.userId === userId) return;

      const cursor: CursorPosition = {
        userId: event.userId,
        widgetId: event.widgetId,
        position: event.position,
        timestamp: event.timestamp,
      };

      setCursorPositions(prev => {
        const filtered = prev.filter(
          c => !(c.userId === event.userId && c.widgetId === event.widgetId)
        );
        return [...filtered, cursor];
      });

      // Don't log cursor events as they're high-frequency
    },
    [enableCursorTracking, userId]
  );

  // Initialize WebSocket connection
  const {
    isConnected,
    broadcastUserActivity,
    broadcastWidgetEditing,
    broadcastCursorPosition,
  } = useWebSocket({
    autoConnect: true,
    onUserActivity: handleUserActivity,
    onWidgetEditing: handleWidgetEditing,
    onCursorPosition: handleCursorPosition,
  });

  // Methods
  const startEditingSession = useCallback(
    (widgetId: string): void => {
      const session: EditingSession = {
        userId,
        widgetId,
        startTime: Date.now(),
        lastActivity: Date.now(),
      };

      setEditingSessions(prev => [
        ...prev.filter(s => !(s.userId === userId && s.widgetId === widgetId)),
        session,
      ]);

      broadcastWidgetEditing(widgetId, 'start');
      broadcastUserActivity('editing', widgetId);

      logger.info('Started editing session:', { widgetId });
    },
    [userId, broadcastWidgetEditing, broadcastUserActivity]
  );

  const endEditingSession = useCallback(
    (widgetId: string): void => {
      setEditingSessions(prev =>
        prev.filter(s => !(s.userId === userId && s.widgetId === widgetId))
      );

      broadcastWidgetEditing(widgetId, 'end');
      broadcastUserActivity('viewing', widgetId);

      logger.info('Ended editing session:', { widgetId });
    },
    [userId, broadcastWidgetEditing, broadcastUserActivity]
  );

  const updateEditingActivity = useCallback(
    (widgetId: string): void => {
      setEditingSessions(prev =>
        prev.map(session =>
          session.userId === userId && session.widgetId === widgetId
            ? { ...session, lastActivity: Date.now() }
            : session
        )
      );

      broadcastWidgetEditing(widgetId, 'update');
    },
    [userId, broadcastWidgetEditing]
  );

  const broadcastActivity = useCallback(
    (action: UserActivity['action'], widgetId?: string): void => {
      const activity: UserActivity = {
        userId,
        action,
        widgetId,
        timestamp: Date.now(),
      };

      // Add to local activities
      setUserActivities(prev => [activity, ...prev.slice(0, 49)]);

      // Broadcast to other users
      broadcastUserActivity(action, widgetId);

      logger.info('Broadcasted activity:', { activity });
    },
    [userId, broadcastUserActivity]
  );

  const updateCursorPosition = useCallback(
    (position: { x: number; y: number }, widgetId?: string): void => {
      if (!enableCursorTracking || !isConnected) return;

      const now = Date.now();

      // Throttle cursor updates
      if (now - lastCursorUpdate.current < cursorThrottleMs) {
        if (cursorThrottleRef.current) {
          clearTimeout(cursorThrottleRef.current);
        }

        cursorThrottleRef.current = setTimeout(() => {
          broadcastCursorPosition(position, widgetId);
          lastCursorUpdate.current = Date.now();
        }, cursorThrottleMs);

        return;
      }

      broadcastCursorPosition(position, widgetId);
      lastCursorUpdate.current = now;
    },
    [
      enableCursorTracking,
      isConnected,
      cursorThrottleMs,
      broadcastCursorPosition,
    ]
  );

  // Getters
  const getUsersEditingWidget = useCallback(
    (widgetId: string): EditingSession[] => {
      const now = Date.now();
      return editingSessions.filter(
        session =>
          session.widgetId === widgetId &&
          session.userId !== userId &&
          now - session.lastActivity < 30000 // Active within last 30 seconds
      );
    },
    [editingSessions, userId]
  );

  const getRecentActivities = useCallback(
    (maxAge = 300000): UserActivity[] => {
      const now = Date.now();
      return userActivities.filter(
        activity =>
          activity.userId !== userId && now - activity.timestamp < maxAge
      );
    },
    [userActivities, userId]
  );

  const getCursorPositions = useCallback(
    (widgetId?: string): CursorPosition[] => {
      const now = Date.now();
      return cursorPositions.filter(
        cursor =>
          cursor.userId !== userId &&
          now - cursor.timestamp < 5000 && // Active within last 5 seconds
          (!widgetId || cursor.widgetId === widgetId)
      );
    },
    [cursorPositions, userId]
  );

  // Cleanup old data
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();

      // Remove old activities (older than 5 minutes)
      setUserActivities(prev =>
        prev.filter(activity => now - activity.timestamp < 300000)
      );

      // Remove inactive editing sessions (inactive for more than 30 seconds)
      setEditingSessions(prev =>
        prev.filter(session => now - session.lastActivity < 30000)
      );

      // Remove old cursor positions (older than 5 seconds)
      setCursorPositions(prev =>
        prev.filter(cursor => now - cursor.timestamp < 5000)
      );
    }, 10000); // Clean up every 10 seconds

    return (): void => clearInterval(cleanup);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, []);

  return {
    // State
    editingSessions,
    userActivities,
    cursorPositions,
    isConnected,

    // Methods
    startEditingSession,
    endEditingSession,
    updateEditingActivity,
    broadcastActivity,
    updateCursorPosition,

    // Getters
    getUsersEditingWidget,
    getRecentActivities,
    getCursorPositions,
  };
}
