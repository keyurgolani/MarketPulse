import React from 'react';
import { cn } from '../../utils/cn';

export interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
  lastUpdate?: number;
  error?: Error | null;
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting = false,
  lastUpdate,
  error,
  className,
  showText = true,
  size = 'md',
}) => {
  const getStatusColor = (): string => {
    if (error) return 'text-red-500 bg-red-100 dark:bg-red-900/20';
    if (isConnecting)
      return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
    if (isConnected) return 'text-green-500 bg-green-100 dark:bg-green-900/20';
    return 'text-gray-500 bg-gray-100 dark:bg-gray-900/20';
  };

  const getStatusText = (): string => {
    if (error) return 'Connection Error';
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusIcon = (): string => {
    if (error) return '⚠️';
    if (isConnecting) return '🔄';
    if (isConnected) return '🟢';
    return '🔴';
  };

  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-1';
      case 'lg':
        return 'text-base px-4 py-2';
      default:
        return 'text-sm px-3 py-1.5';
    }
  };

  const getLastUpdateText = (): string => {
    if (!lastUpdate) return '';

    const now = Date.now();
    const diff = now - lastUpdate;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border transition-all duration-200',
        getStatusColor(),
        getSizeClasses(),
        className
      )}
      title={error ? error.message : `Status: ${getStatusText()}`}
    >
      <span
        className={cn('inline-block', isConnecting && 'animate-spin')}
        role="img"
        aria-label={getStatusText()}
      >
        {getStatusIcon()}
      </span>

      {showText && <span className="font-medium">{getStatusText()}</span>}

      {lastUpdate && isConnected && (
        <span className="text-xs opacity-75">{getLastUpdateText()}</span>
      )}
    </div>
  );
};

export default ConnectionStatus;
