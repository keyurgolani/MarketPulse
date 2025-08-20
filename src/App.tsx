import React from 'react';

// This file is now replaced by the router configuration
// The App component is no longer used as the main entry point
// See src/router/index.tsx for the new routing setup

function App(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          App Component Deprecated
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          This component has been replaced by the router configuration.
        </p>
      </div>
    </div>
  );
}

export default App;
