/**
 * Collaborative Editing Indicators Component
 * Shows real-time collaborative editing indicators and user activity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDashboardSync } from '../../hooks/useDashboardSync';
import { useWebSocket } from '../../hooks/useWebSocket';

export interface CollaborativeEditingIndicatorsProps {
  dashboardId: string;
  userId: string;
  widgetId?: string;
  className?: string;
  showUserActivity?: boolean;
  showEditingStatus?: boolean;
}

interface UserActivity {
  userId: string;
  action: 'editing' | 'viewing' | 'configuring';
  widgetId?: string;
  timestamp: number;
}

interface EditingSession {
  userId: string;
  widgetId: string;
  startTime: number;
  lastActivity: number;
}

export const CollaborativeEditingIndicators: React.FC<
  CollaborativeEditingIndicatorsProps
> = ({
  dashboardId,
  userId,
  widgetId,
  className = '',
  showUserActivity = true,
  showEditingStatus = true,
}) => {
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [editingSessions, setEditingSessions] = useState<EditingSession[]>([]);
  const [showActivityFeed, setShowActivityFeed] = useState(false);

  const { isConnected, connectedUsers } = useDashboardSync({
    dashboardId,
    userId,
    autoSync: true,
  });

  const { broadcastDashboardChange } = useWebSocket({
    autoConnect: false,
  });

  /**
   * Broadcast user activity
   */
  const broadcastActivity = useCallback(
    (action: UserActivity['action'], targetWidgetId?: string): void => {
      if (!isConnected) return;

      const activity: UserActivity = {
        userId,
        action,
        widgetId: targetWidgetId,
        timestamp: Date.now(),
      };

      // Add to local activities
      setUserActivities(prev => [activity, ...prev.slice(0, 9)]); // Keep last 10 activities

      // Broadcast to other users
      broadcastDashboardChange({
        type: 'dashboard_updated',
        dashboardId,
        userId,
        data: {
          type: 'user_activity',
          activity,
        },
        timestamp: Date.now(),
      });
    },
    [isConnected, userId, dashboardId, broadcastDashboardChange]
  );

  /**
   * Start editing session
   */
  const startEditingSession = useCallback(
    (targetWidgetId: string): void => {
      const session: EditingSession = {
        userId,
        widgetId: targetWidgetId,
        startTime: Date.now(),
        lastActivity: Date.now(),
      };

      setEditingSessions(prev => [
        ...prev.filter(
          s => !(s.userId === userId && s.widgetId === targetWidgetId)
        ),
        session,
      ]);

      broadcastActivity('editing', targetWidgetId);
    },
    [userId, broadcastActivity]
  );

  /**
   * End editing session
   */
  const endEditingSession = useCallback(
    (targetWidgetId: string): void => {
      setEditingSessions(prev =>
        prev.filter(
          s => !(s.userId === userId && s.widgetId === targetWidgetId)
        )
      );

      broadcastActivity('viewing', targetWidgetId);
    },
    [userId, broadcastActivity]
  );

  /**
   * Update editing session activity
   */
  const updateEditingActivity = useCallback(
    (targetWidgetId: string): void => {
      setEditingSessions(prev =>
        prev.map(session =>
          session.userId === userId && session.widgetId === targetWidgetId
            ? { ...session, lastActivity: Date.now() }
            : session
        )
      );
    },
    [userId]
  );

  /**
   * Get users currently editing a widget
   */
  const getUsersEditingWidget = (targetWidgetId: string): EditingSession[] => {
    const now = Date.now();
    return editingSessions.filter(
      session =>
        session.widgetId === targetWidgetId &&
        session.userId !== userId &&
        now - session.lastActivity < 30000 // Active within last 30 seconds
    );
  };

  /**
   * Get recent user activities
   */
  const getRecentActivities = (): UserActivity[] => {
    const now = Date.now();
    return userActivities.filter(
      activity =>
        activity.userId !== userId && now - activity.timestamp < 300000 // Within last 5 minutes
    );
  };

  /**
   * Format activity message
   */
  const formatActivityMessage = useCallback(
    (activity: UserActivity): string => {
      const timeAgo = Math.floor((Date.now() - activity.timestamp) / 1000);
      const timeText =
        timeAgo < 60 ? 'just now' : `${Math.floor(timeAgo / 60)}m ago`;

      switch (activity.action) {
        case 'editing':
          return `${activity.userId} started editing ${activity.widgetId ? `widget ${activity.widgetId}` : 'dashboard'} ${timeText}`;
        case 'configuring':
          return `${activity.userId} is configuring ${activity.widgetId ? `widget ${activity.widgetId}` : 'dashboard'} ${timeText}`;
        case 'viewing':
          return `${activity.userId} is viewing ${activity.widgetId ? `widget ${activity.widgetId}` : 'dashboard'} ${timeText}`;
        default:
          return `${activity.userId} performed an action ${timeText}`;
      }
    },
    []
  );

  /**
   * Clean up old activities and sessions
   */
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
    }, 10000); // Clean up every 10 seconds

    return (): void => clearInterval(cleanup);
  }, []);

  // Expose methods for parent components to use
  useEffect(() => {
    // Add methods to window for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      (
        window as unknown as { collaborativeEditing?: unknown }
      ).collaborativeEditing = {
        startEditingSession,
        endEditingSession,
        updateEditingActivity,
        broadcastActivity,
      };
    }

    return (): void => {
      if (process.env.NODE_ENV === 'development') {
        delete (window as unknown as { collaborativeEditing?: unknown })
          .collaborativeEditing;
      }
    };
  }, [
    startEditingSession,
    endEditingSession,
    updateEditingActivity,
    broadcastActivity,
  ]);

  if (!isConnected || connectedUsers.length === 0) {
    return null;
  }

  const currentWidgetEditors = widgetId ? getUsersEditingWidget(widgetId) : [];
  const recentActivities = getRecentActivities();

  return (
    <div className={`collaborative-editing-indicators ${className}`}>
      {/* Widget-specific editing indicators */}
      {showEditingStatus && widgetId && currentWidgetEditors.length > 0 && (
        <div className="widget-editing-indicator flex items-center space-x-2 mb-2">
          <div className="flex -space-x-1">
            {currentWidgetEditors.map(session => (
              <div
                key={`${session.userId}-${session.widgetId}`}
                className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-white font-medium animate-pulse"
                title={`${session.userId} is editing this widget`}
              >
                ✏️
              </div>
            ))}
          </div>
          <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
            {currentWidgetEditors.length === 1
              ? `${currentWidgetEditors[0].userId} is editing`
              : `${currentWidgetEditors.length} users editing`}
          </span>
        </div>
      )}

      {/* User activity feed */}
      {showUserActivity && recentActivities.length > 0 && (
        <div className="user-activity-section">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Recent Activity ({recentActivities.length})
            </span>
            <button
              onClick={() => setShowActivityFeed(!showActivityFeed)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
              aria-label={
                showActivityFeed ? 'Hide activity feed' : 'Show activity feed'
              }
            >
              {showActivityFeed ? 'Hide' : 'Show'}
            </button>
          </div>

          {showActivityFeed && (
            <div className="activity-feed bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
              {recentActivities.map((activity, index) => (
                <div
                  key={`${activity.userId}-${activity.timestamp}-${index}`}
                  className="activity-item text-xs text-gray-600 dark:text-gray-400 mb-1 last:mb-0"
                >
                  {formatActivityMessage(activity)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live collaboration status */}
      <div className="collaboration-status flex items-center space-x-2 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-gray-600 dark:text-gray-400">
            Live collaboration active
          </span>
        </div>

        {connectedUsers.length > 0 && (
          <span className="text-gray-500 dark:text-gray-500">
            • {connectedUsers.length} user
            {connectedUsers.length !== 1 ? 's' : ''} online
          </span>
        )}
      </div>
    </div>
  );
};

export default CollaborativeEditingIndicators;
