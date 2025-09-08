import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  AssetList,
  AssetDetail,
} from '@/components/ui';
import { AssetWidget } from '@/components/widgets';
import { Asset } from '@/types/asset';

export const Markets: React.FC = (): React.JSX.Element => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const handleAssetSelect = (asset: Asset): void => {
    setSelectedAsset(asset);
  };

  const handleCloseDetail = (): void => {
    setSelectedAsset(null);
  };

  return (
    <div className='container mx-auto px-4 py-8 space-y-8'>
      <div>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
          Markets
        </h1>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          Explore market data and asset performance
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Asset List */}
        <div className='lg:col-span-2'>
          <AssetList
            title='All Assets'
            showSearch={true}
            showPagination={true}
            onAssetSelect={handleAssetSelect}
            onAssetView={handleAssetSelect}
          />
        </div>

        {/* Asset Detail or Popular Assets */}
        <div className='lg:col-span-1'>
          {selectedAsset ? (
            <AssetDetail
              symbol={selectedAsset.symbol}
              onClose={handleCloseDetail}
              onAddToWatchlist={(asset) => {
                // TODO: Implement add to watchlist functionality
                console.log('Add to watchlist:', asset.symbol);
              }}
            />
          ) : (
            <Card variant='elevated'>
              <CardHeader>
                <CardTitle>Popular Assets</CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                <AssetList
                  variant='popular'
                  showSearch={false}
                  showPagination={false}
                  onAssetSelect={handleAssetSelect}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sample Asset Widgets */}
      <div>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4'>
          Sample Asset Widgets
        </h2>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <AssetWidget
            config={{
              symbol: 'AAPL',
              displayMode: 'detailed',
              showVolume: true,
              refreshInterval: 30000,
            }}
          />
          <AssetWidget
            config={{
              symbol: 'GOOGL',
              displayMode: 'compact',
              showVolume: false,
              refreshInterval: 30000,
            }}
          />
          <AssetWidget
            config={{
              symbol: 'MSFT',
              displayMode: 'detailed',
              showVolume: true,
              refreshInterval: 30000,
            }}
          />
          <AssetWidget
            config={{
              symbol: 'TSLA',
              displayMode: 'compact',
              showVolume: false,
              refreshInterval: 30000,
            }}
          />
        </div>
      </div>
    </div>
  );
};
