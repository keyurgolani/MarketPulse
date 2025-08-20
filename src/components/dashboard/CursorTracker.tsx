/**
 * Cursor Tracker Component
 * Shows real-time cursor positions of other users
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useCollaborativeEditing } from '../../hooks/useCollaborativeEditing';

export interface CursorTrackerProps {
  dashboardId: string;
  userId: string;
  widgetId?: string;
  className?: string;
  enabled?: boolean;
}

interface CursorDisplay {
  userId: string;
  position: { x: number; y: number };
  color: string;
  timestamp: number;
}

const USER_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export const CursorTracker: React.FC<CursorTrackerProps> = ({
  dashboardId,
  userId,
  widgetId,
  className = '',
  enabled = true,
}) => {
  const [cursors, setCursors] = useState<CursorDisplay[]>([]);
  const [userColorMap, setUserColorMap] = useState<Map<string, string>>(
    new Map()
  );

  const { getCursorPositions, updateCursorPosition, isConnected } =
    useCollaborativeEditing({
      dashboardId,
      userId,
      enableCursorTracking: enabled,
    });

  /**
   * Get color for user
   */
  const getUserColor = useCallback(
    (targetUserId: string): string => {
      if (userColorMap.has(targetUserId)) {
        return userColorMap.get(targetUserId)!;
      }

      const colorIndex = userColorMap.size % USER_COLORS.length;
      const color = USER_COLORS[colorIndex];

      setUserColorMap(prev => new Map(prev).set(targetUserId, color));
      return color;
    },
    [userColorMap]
  );

  /**
   * Handle mouse move events
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent): void => {
      if (!enabled || !isConnected) return;

      const rect = (event.currentTarget as Element)?.getBoundingClientRect();
      if (!rect) return;

      const position = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      updateCursorPosition(position, widgetId);
    },
    [enabled, isConnected, updateCursorPosition, widgetId]
  );

  /**
   * Update cursor positions from collaborative editing hook
   */
  useEffect((): (() => void) => {
    const updateCursors = (): void => {
      const positions = getCursorPositions(widgetId);

      const displayCursors: CursorDisplay[] = positions.map(cursor => ({
        userId: cursor.userId,
        position: cursor.position,
        color: getUserColor(cursor.userId),
        timestamp: cursor.timestamp,
      }));

      setCursors(displayCursors);
    };

    // Update cursors every 100ms
    const interval = setInterval(updateCursors, 100);

    // Initial update
    updateCursors();

    return (): void => clearInterval(interval);
  }, [getCursorPositions, widgetId, getUserColor]);

  /**
   * Add mouse move listener to track current user's cursor
   */
  useEffect((): (() => void) | undefined => {
    if (!enabled) return;

    const element = document.getElementById(widgetId || 'dashboard-container');
    if (!element) return;

    element.addEventListener('mousemove', handleMouseMove);

    return (): void => {
      element.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, widgetId, handleMouseMove]);

  if (!enabled || !isConnected || cursors.length === 0) {
    return null;
  }

  return (
    <div
      className={`cursor-tracker absolute inset-0 pointer-events-none z-50 ${className}`}
    >
      {cursors.map(cursor => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* Cursor pointer */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="drop-shadow-lg"
          >
            <path
              d="M2 2L18 8L8 12L2 18V2Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1"
            />
          </svg>

          {/* User label */}
          <div
            className="absolute top-5 left-2 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userId}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CursorTracker;
