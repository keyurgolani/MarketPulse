import React from 'react';
import { useDashboardSync } from '../../hooks/useDashboardSync';

export interface CollaborativeIndicatorsProps {
  dashboardId: string;
  userId: string;
  className?: string;
}

export const CollaborativeIndicators: React.FC<
  CollaborativeIndicatorsProps
> = ({ dashboardId, userId, className = '' }) => {
  const {
    isConnected,
    isSyncing,
    hasConflicts,
    lastSyncTime,
    connectedUsers,
    resolveConflict,
  } = useDashboardSync({
    dashboardId,
    userId,
    autoSync: true,
    conflictResolution: 'manual',
  });

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getConnectionStatusColor = (): string => {
    if (!isConnected) return 'text-red-500';
    if (isSyncing) return 'text-yellow-500';
    if (hasConflicts) return 'text-orange-500';
    return 'text-green-500';
  };

  const getConnectionStatusIcon = (): string => {
    if (!isConnected) return '●';
    if (isSyncing) return '◐';
    if (hasConflicts) return '⚠';
    return '●';
  };

  const getConnectionStatusText = (): string => {
    if (!isConnected) return 'Disconnected';
    if (isSyncing) return 'Syncing...';
    if (hasConflicts) return 'Conflicts detected';
    return 'Connected';
  };

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <span
          className={`text-sm font-medium ${getConnectionStatusColor()}`}
          title={getConnectionStatusText()}
          aria-label={`Connection status: ${getConnectionStatusText()}`}
        >
          {getConnectionStatusIcon()}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getConnectionStatusText()}
        </span>
      </div>

      {/* Last Sync Time */}
      {isConnected && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last sync: {formatLastSync(lastSyncTime)}
        </div>
      )}

      {/* Connected Users */}
      {connectedUsers.length > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {connectedUsers.length} other
            {connectedUsers.length !== 1 ? 's' : ''} viewing
          </span>
          <div className="flex -space-x-1">
            {connectedUsers.slice(0, 3).map((user, index) => (
              <div
                key={user}
                className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-white font-medium"
                title={`User: ${user}`}
                style={{ zIndex: 10 - index }}
              >
                {user.charAt(0).toUpperCase()}
              </div>
            ))}
            {connectedUsers.length > 3 && (
              <div
                className="w-6 h-6 rounded-full bg-gray-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-white font-medium"
                title={`+${connectedUsers.length - 3} more users`}
              >
                +{connectedUsers.length - 3}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflict Resolution */}
      {hasConflicts && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            Conflicts detected
          </span>
          <div className="flex space-x-1">
            <button
              onClick={() => resolveConflict('server')}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              title="Use server version"
            >
              Use Server
            </button>
            <button
              onClick={() => resolveConflict('client')}
              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
              title="Use local version"
            >
              Use Local
            </button>
          </div>
        </div>
      )}

      {/* Sync Indicator */}
      {isSyncing && (
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400">
            Syncing changes...
          </span>
        </div>
      )}
    </div>
  );
};

export default CollaborativeIndicators;
