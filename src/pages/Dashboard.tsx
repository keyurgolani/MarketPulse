import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export const Dashboard: React.FC = (): React.JSX.Element => {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
          Dashboard
        </h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          Monitor your portfolio and market data in real-time
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <Card variant='elevated'>
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-gray-600 dark:text-gray-400'>
              Your portfolio performance and key metrics will be displayed here.
            </p>
          </CardContent>
        </Card>

        <Card variant='elevated'>
          <CardHeader>
            <CardTitle>Market Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-gray-600 dark:text-gray-400'>
              Real-time market data and trending assets will be shown here.
            </p>
          </CardContent>
        </Card>

        <Card variant='elevated'>
          <CardHeader>
            <CardTitle>Recent News</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-gray-600 dark:text-gray-400'>
              Latest financial news and market updates will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
