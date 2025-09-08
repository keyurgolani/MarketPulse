import React from 'react';
import { clsx } from 'clsx';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  BuildingOfficeIcon,
  TagIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { LoadingSpinner, Skeleton } from './LoadingSpinner';
import { useAsset, useAssetPrice } from '@/hooks/useAssetData';
import { Asset } from '@/types/asset';
import {
  formatAssetForDisplay,
  getAssetTypeDisplayName,
} from '@/utils/assetFormatters';

export interface AssetDetailProps {
  symbol: string;
  onClose?: () => void;
  onAddToWatchlist?: (asset: Asset) => void;
  className?: string;
  refreshInterval?: number;
}

export const AssetDetail: React.FC<AssetDetailProps> = ({
  symbol,
  onClose,
  onAddToWatchlist,
  className,
  refreshInterval = 30000,
}): React.JSX.Element => {
  const {
    data: asset,
    isLoading: assetLoading,
    error: assetError,
  } = useAsset(symbol);

  const {
    data: price,
    isLoading: priceLoading,
    error: priceError,
  } = useAssetPrice(symbol, { refetchInterval: refreshInterval });

  const isLoading = assetLoading || priceLoading;
  const error = assetError ?? priceError;

  // Format asset data for display
  const displayData = React.useMemo(() => {
    if (!asset) return null;

    return formatAssetForDisplay(asset, price, {
      showCurrency: true,
      showExchange: true,
      showSector: true,
      showMarketCap: true,
    });
  }, [asset, price]);

  // Loading state
  if (isLoading && !displayData) {
    return (
      <Card className={clsx('h-full', className)}>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <Skeleton width='100px' height='28px' />
              <Skeleton width='200px' height='20px' className='mt-2' />
            </div>
            {onClose && (
              <Button variant='ghost' size='sm' onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            {/* Price section */}
            <div>
              <Skeleton width='150px' height='40px' />
              <Skeleton width='120px' height='24px' className='mt-2' />
            </div>

            {/* Stats grid */}
            <div className='grid grid-cols-2 gap-4'>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index}>
                  <Skeleton width='80px' height='16px' />
                  <Skeleton width='100px' height='20px' className='mt-1' />
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <Skeleton width='100px' height='20px' />
              <Skeleton width='100%' height='16px' className='mt-2' />
              <Skeleton width='80%' height='16px' className='mt-1' />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !displayData) {
    return (
      <Card className={clsx('h-full', className)}>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Asset Details</CardTitle>
            {onClose && (
              <Button variant='ghost' size='sm' onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center h-64'>
            <div className='text-center'>
              <div className='text-red-500 dark:text-red-400 mb-4'>
                <ClockIcon className='h-12 w-12 mx-auto' />
              </div>
              <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                Failed to load asset details
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
                {error.message}
              </p>
              <Button
                variant='outline'
                size='sm'
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayData || !asset) {
    return (
      <Card className={clsx('h-full', className)}>
        <CardContent>
          <div className='flex items-center justify-center h-64'>
            <p className='text-gray-600 dark:text-gray-400'>
              No asset data available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const changeColorClasses = displayData.change?.colorClasses;

  return (
    <Card className={clsx('h-full', className)}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <div className='flex items-center space-x-3'>
              <CardTitle className='text-2xl font-bold'>
                {displayData.symbol}
              </CardTitle>
              {displayData.exchange && (
                <span className='text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded'>
                  {displayData.exchange}
                </span>
              )}
              {priceLoading && <LoadingSpinner size='sm' />}
            </div>
            <p className='text-lg text-gray-600 dark:text-gray-400 mt-1'>
              {displayData.name}
            </p>
          </div>

          <div className='flex items-center space-x-2'>
            {onAddToWatchlist && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => onAddToWatchlist(asset)}
              >
                Add to Watchlist
              </Button>
            )}
            {onClose && (
              <Button variant='ghost' size='sm' onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className='space-y-6'>
          {/* Price Section */}
          <div>
            <div className='flex items-baseline space-x-3'>
              {displayData.price ? (
                <span className='text-4xl font-bold text-gray-900 dark:text-gray-100'>
                  {displayData.price}
                </span>
              ) : (
                <Skeleton width='200px' height='48px' />
              )}
            </div>

            {displayData.change && changeColorClasses && (
              <div
                className={clsx(
                  'flex items-center space-x-2 mt-2',
                  changeColorClasses.text
                )}
              >
                {changeColorClasses.text.includes('green') ? (
                  <ArrowTrendingUpIcon className='h-5 w-5' />
                ) : changeColorClasses.text.includes('red') ? (
                  <ArrowTrendingDownIcon className='h-5 w-5' />
                ) : null}
                <span className='text-lg font-semibold'>
                  {displayData.change.absolute}
                </span>
                <span className='text-lg'>
                  ({displayData.change.percentage})
                </span>
              </div>
            )}

            {displayData.lastUpdated && (
              <p className='text-sm text-gray-500 dark:text-gray-500 mt-2'>
                Last updated: {displayData.lastUpdated}
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className='grid grid-cols-2 gap-6'>
            {displayData.volume && (
              <div className='flex items-center space-x-3'>
                <div className='flex-shrink-0'>
                  <ChartBarIcon className='h-5 w-5 text-gray-400' />
                </div>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Volume
                  </p>
                  <p className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                    {displayData.volume}
                  </p>
                </div>
              </div>
            )}

            {displayData.marketCap && (
              <div className='flex items-center space-x-3'>
                <div className='flex-shrink-0'>
                  <CurrencyDollarIcon className='h-5 w-5 text-gray-400' />
                </div>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Market Cap
                  </p>
                  <p className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                    {displayData.marketCap}
                  </p>
                </div>
              </div>
            )}

            {asset.type && (
              <div className='flex items-center space-x-3'>
                <div className='flex-shrink-0'>
                  <TagIcon className='h-5 w-5 text-gray-400' />
                </div>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Type
                  </p>
                  <p className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                    {getAssetTypeDisplayName(asset.type)}
                  </p>
                </div>
              </div>
            )}

            {displayData.sector && (
              <div className='flex items-center space-x-3'>
                <div className='flex-shrink-0'>
                  <BuildingOfficeIcon className='h-5 w-5 text-gray-400' />
                </div>
                <div>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Sector
                  </p>
                  <p className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                    {displayData.sector}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className='space-y-4'>
            {asset.industry && (
              <div>
                <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-1'>
                  Industry
                </h4>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {asset.industry}
                </p>
              </div>
            )}

            {asset.description && (
              <div>
                <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-2'>
                  Description
                </h4>
                <p className='text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
                  {asset.description}
                </p>
              </div>
            )}

            {asset.currency && asset.currency !== 'USD' && (
              <div>
                <h4 className='text-sm font-medium text-gray-900 dark:text-gray-100 mb-1'>
                  Currency
                </h4>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {asset.currency}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
