import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export const News: React.FC = (): React.JSX.Element => {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
          News
        </h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          Stay updated with the latest financial news and market insights
        </p>
      </div>

      <Card variant='elevated'>
        <CardHeader>
          <CardTitle>Financial News</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-gray-600 dark:text-gray-400'>
            News aggregation and sentiment analysis will be implemented in later
            tasks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
