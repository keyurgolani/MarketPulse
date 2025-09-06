import React from 'react';

// Placeholder App component - will be implemented in later tasks
export function App(): React.JSX.Element {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-4xl font-bold text-center text-gray-900 dark:text-white mb-8'>
          MarketPulse
        </h1>
        <div className='text-center'>
          <p className='text-lg text-gray-600 dark:text-gray-300 mb-4'>
            Financial Dashboard Platform
          </p>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Project structure and build configuration completed successfully.
          </p>
        </div>
      </div>
    </div>
  );
}
