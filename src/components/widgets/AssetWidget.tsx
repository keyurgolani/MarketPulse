import React from 'react';
import { clsx } from 'clsx';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LoadingSpinner, Skeleton } from '@/components/ui/LoadingSpinner';
import { useAsset, useAssetPrice } from '@/hooks/useAssetData';
import { AssetWidgetConfig } from '@/types/asset';
import {
  formatAssetForDisplay,
  getPriceChangeColorClasses,
} from '@/utils/assetFormatters';

export interface AssetWidgetProps {
  config: AssetWidgetConfig;
  className?: string | undefined;
  onError?: ((error: Error) => void) | undefined;
}

export const AssetWidget: React.FC<AssetWidgetProps> = ({
  config,
  className,
  onError,
}): React.JSX.Element => {
  const {
    symbol,
    showVolume = true,
    refreshInterval = 30000, // 30 seconds
    displayMode = 'detailed',
  } = config;

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

  // Report errors to parent component
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Format asset data for display
  const displayData = React.useMemo(() => {
    if (!asset) return null;

    const options: Parameters<typeof formatAssetForDisplay>[2] = {
      showCurrency: true,
      showExchange: displayMode === 'detailed',
      showSector: displayMode === 'detailed',
      showMarketCap: displayMode === 'detailed',
    };

    if (displayMode === 'compact') {
      options.maxNameLength = 20;
    }

    return formatAssetForDisplay(asset, price, options);
  }, [asset, price, displayMode]);

  // Loading state
  if (isLoading && !displayData) {
    return (
      <Card className={clsx('h-full', className)} variant='outlined'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <Skeleton width='60px' height='20px' />
            <Skeleton width='80px' height='16px' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <Skeleton width='120px' height='32px' />
            <div className='flex space-x-4'>
              <Skeleton width='80px' height='20px' />
              <Skeleton width='60px' height='20px' />
            </div>
            {displayMode === 'detailed' && (
              <>
                <Skeleton width='100px' height='16px' />
                <Skeleton width='140px' height='16px' />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !displayData) {
    return (
      <Card className={clsx('h-full', className)} variant='outlined'>
        <CardContent className='flex items-center justify-center h-full'>
          <div className='text-center'>
            <div className='text-red-500 dark:text-red-400 mb-2'>
              <ClockIcon className='h-8 w-8 mx-auto' />
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Failed to load {symbol}
            </p>
            <p className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
              {error.message}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayData) {
    return (
      <Card className={clsx('h-full', className)} variant='outlined'>
        <CardContent className='flex items-center justify-center h-full'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            No data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const changeColorClasses =
    displayData.change?.colorClasses ?? getPriceChangeColorClasses(0);

  return (
    <Card
      className={clsx('h-full transition-shadow hover:shadow-md', className)}
      variant='outlined'
    >
      <CardHeader className={displayMode === 'compact' ? 'pb-2' : undefined}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <CardTitle className='text-lg font-bold'>
              {displayData.symbol}
            </CardTitle>
            {displayData.exchange && displayMode === 'detailed' && (
              <span className='text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded'>
                {displayData.exchange}
              </span>
            )}
          </div>
          {priceLoading && <LoadingSpinner size='sm' />}
        </div>
        {displayMode === 'detailed' && (
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            {displayData.name}
          </p>
        )}
      </CardHeader>

      <CardContent className={displayMode === 'compact' ? 'pt-0' : undefined}>
        <div className='space-y-3'>
          {/* Price */}
          <div className='flex items-baseline space-x-2'>
            {displayData.price ? (
              <span className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                {displayData.price}
              </span>
            ) : (
              <Skeleton width='120px' height='32px' />
            )}
          </div>

          {/* Change */}
          {displayData.change && (
            <div className='flex items-center space-x-2'>
              <div
                className={clsx(
                  'flex items-center space-x-1',
                  changeColorClasses.text
                )}
              >
                {displayData.change.colorClasses.text.includes('green') ? (
                  <ArrowTrendingUpIcon className='h-4 w-4' />
                ) : displayData.change.colorClasses.text.includes('red') ? (
                  <ArrowTrendingDownIcon className='h-4 w-4' />
                ) : null}
                <span className='font-medium'>
                  {displayData.change.absolute}
                </span>
                <span className='text-sm'>
                  ({displayData.change.percentage})
                </span>
              </div>
            </div>
          )}

          {/* Additional info for detailed mode */}
          {displayMode === 'detailed' && (
            <div className='space-y-2 text-sm'>
              {showVolume && displayData.volume && (
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Volume:
                  </span>
                  <span className='font-medium'>{displayData.volume}</span>
                </div>
              )}

              {displayData.marketCap && (
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Market Cap:
                  </span>
                  <span className='font-medium'>{displayData.marketCap}</span>
                </div>
              )}

              {displayData.sector && (
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>
                    Sector:
                  </span>
                  <span className='font-medium'>{displayData.sector}</span>
                </div>
              )}
            </div>
          )}

          {/* Last updated */}
          {displayData.lastUpdated && (
            <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700'>
              <span>Last updated:</span>
              <span>{displayData.lastUpdated}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Compact version for smaller spaces
export const CompactAssetWidget: React.FC<
  Omit<AssetWidgetProps, 'config'> & { symbol: string }
> = ({ symbol, className, onError }): React.JSX.Element => {
  return (
    <AssetWidget
      config={{
        symbol,
        displayMode: 'compact',
        showVolume: false,
      }}
      className={className}
      onError={onError}
    />
  );
};
