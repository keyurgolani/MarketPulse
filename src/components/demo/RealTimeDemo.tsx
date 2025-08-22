import React, { useState } from 'react';
import { RealTimePriceWidget } from '../widgets/RealTimePriceWidget';
import { ConnectionStatus } from '../ui/ConnectionStatus';
import { useOfflineMarketData } from '../../hooks/useOfflineMarketData';
import { cn } from '../../utils/cn';

export const RealTimeDemo: React.FC = () => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    'AAPL',
    'GOOGL',
    'MSFT',
  ]);
  const [newSymbol, setNewSymbol] = useState('');

  const {
    isConnected,
    isOffline,
    networkStatus,
    latestPrices,
    cachedPrices,
    queuedActions,
    refreshData,
    clearCache,
    error,
    lastUpdate,
  } = useOfflineMarketData({
    symbols: selectedSymbols,
    userId: 'demo-user',
    enableOfflineMode: true,
  });

  const addSymbol = (): void => {
    if (newSymbol && !selectedSymbols.includes(newSymbol.toUpperCase())) {
      const updatedSymbols = [...selectedSymbols, newSymbol.toUpperCase()];
      setSelectedSymbols(updatedSymbols);
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol: string): void => {
    const updatedSymbols = selectedSymbols.filter(s => s !== symbol);
    setSelectedSymbols(updatedSymbols);
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      addSymbol();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Real-Time Market Data Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test WebSocket connections, offline functionality, and real-time price
          updates
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <ConnectionStatus
              isConnected={isConnected}
              isConnecting={false}
              lastUpdate={lastUpdate}
              error={error}
              showText={true}
              size="md"
            />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div>
                Network: {networkStatus.isOnline ? 'Online' : 'Offline'}
              </div>
              <div>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</div>
              {networkStatus.connectionType && (
                <div>Type: {networkStatus.connectionType}</div>
              )}
              {networkStatus.effectiveType && (
                <div>Speed: {networkStatus.effectiveType}</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <div className="font-medium">Statistics</div>
              <div>Live Prices: {latestPrices.size}</div>
              <div>Cached Prices: {cachedPrices.size}</div>
              <div>Queued Actions: {queuedActions}</div>
              {lastUpdate > 0 && (
                <div>
                  Last Update: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Symbol Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold mb-4">Symbol Management</h2>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSymbol}
            onChange={e => setNewSymbol(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            placeholder="Enter symbol (e.g., TSLA)"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={addSymbol}
            disabled={!newSymbol}
            className={cn(
              'px-4 py-2 rounded-md font-medium transition-colors',
              newSymbol
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {selectedSymbols.map(symbol => (
            <div
              key={symbol}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm"
            >
              <span>{symbol}</span>
              <button
                onClick={() => removeSymbol(symbol)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={refreshData}
            disabled={isOffline}
            className={cn(
              'px-4 py-2 rounded-md font-medium transition-colors',
              !isOffline
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            Refresh Data
          </button>

          <button
            onClick={clearCache}
            className="px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Offline Mode Indicator */}
      {isOffline && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <div>
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                Offline Mode Active
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                Showing cached data. New subscriptions will be queued until
                connection is restored.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400">❌</span>
            <div>
              <div className="font-medium text-red-800 dark:text-red-200">
                Connection Error
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                {error.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-Time Price Widget */}
      <RealTimePriceWidget
        symbols={selectedSymbols}
        userId="demo-user"
        showConnectionStatus={false}
        maxDisplaySymbols={10}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      />

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
          <div className="text-xs font-mono space-y-1">
            <div>Environment: {process.env.NODE_ENV}</div>
            <div>
              WebSocket URL:{' '}
              {import.meta.env.VITE_WS_URL || 'http://localhost:3001'}
            </div>
            <div>
              API Base URL:{' '}
              {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}
            </div>
            <div>Selected Symbols: {JSON.stringify(selectedSymbols)}</div>
            <div>Network Status: {JSON.stringify(networkStatus, null, 2)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeDemo;
