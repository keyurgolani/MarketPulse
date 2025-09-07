import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export const Watchlist: React.FC = (): React.JSX.Element => {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
          Watchlist
        </h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          Track your favorite assets and monitor their performance
        </p>
      </div>

      <Card variant='elevated'>
        <CardHeader>
          <CardTitle>Your Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-gray-600 dark:text-gray-400'>
            Custom watchlists and asset tracking will be implemented in later
            tasks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
