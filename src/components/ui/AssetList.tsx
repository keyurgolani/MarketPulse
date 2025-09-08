import React, { useState } from 'react';
import { clsx } from 'clsx';
import { EyeIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Skeleton } from './LoadingSpinner';
import { AssetSearch } from './AssetSearch';
import { useAssetList, usePopularAssets } from '@/hooks/useAssetData';
import { Asset, AssetSearchResult, AssetListParams } from '@/types/asset';
import { formatAssetForDisplay } from '@/utils/assetFormatters';

export interface AssetListProps {
  title?: string;
  showSearch?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  onAssetSelect?: (asset: Asset) => void;
  onAssetView?: (asset: Asset) => void;
  className?: string;
  variant?: 'default' | 'popular' | 'search';
  searchParams?: AssetListParams;
}

export const AssetList: React.FC<AssetListProps> = ({
  title = 'Assets',
  showSearch = true,
  showPagination = true,
  pageSize = 20,
  onAssetSelect,
  onAssetView,
  className,
  variant = 'default',
  searchParams: initialSearchParams,
}): React.JSX.Element => {
  const [searchParams, setSearchParams] = useState<AssetListParams>({
    page: 1,
    limit: pageSize,
    ...initialSearchParams,
  });

  // Use different hooks based on variant
  const {
    data: assetListData,
    isLoading: listLoading,
    error: listError,
  } = useAssetList(searchParams, {
    enabled: variant === 'default' || variant === 'search',
  });

  const {
    data: popularAssets,
    isLoading: popularLoading,
    error: popularError,
  } = usePopularAssets({ enabled: variant === 'popular' });

  // Determine which data to use
  const assets = variant === 'popular' ? popularAssets : assetListData?.assets;
  const metadata = variant === 'popular' ? undefined : assetListData?.metadata;
  const isLoading = variant === 'popular' ? popularLoading : listLoading;
  const error = variant === 'popular' ? popularError : listError;

  // Handle asset selection from search
  const handleAssetSearchSelect = (asset: AssetSearchResult): void => {
    onAssetSelect?.(asset);
  };

  // Handle pagination
  const handlePageChange = (newPage: number): void => {
    setSearchParams((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // Handle asset click
  const handleAssetClick = (asset: Asset): void => {
    onAssetSelect?.(asset);
  };

  // Handle view asset
  const handleViewAsset = (asset: Asset, e: React.MouseEvent): void => {
    e.stopPropagation();
    onAssetView?.(asset);
  };

  return (
    <Card className={clsx('h-full', className)}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>{title}</CardTitle>
          {assets && (
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {assets.length} assets
            </span>
          )}
        </div>

        {showSearch && (
          <div className='mt-4'>
            <AssetSearch
              placeholder='Search assets...'
              onSelect={handleAssetSearchSelect}
              maxResults={10}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className='p-0'>
        {/* Loading state */}
        {isLoading && (
          <div className='space-y-2 p-6'>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className='flex items-center justify-between py-3'
              >
                <div className='flex items-center space-x-3'>
                  <Skeleton width='60px' height='20px' />
                  <div>
                    <Skeleton width='120px' height='16px' />
                    <Skeleton width='80px' height='14px' className='mt-1' />
                  </div>
                </div>
                <div className='text-right'>
                  <Skeleton width='80px' height='20px' />
                  <Skeleton width='60px' height='16px' className='mt-1' />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <p className='text-red-600 dark:text-red-400 mb-2'>
                Failed to load assets
              </p>
              <p className='text-sm text-gray-500 dark:text-gray-500'>
                {error.message}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!assets || assets.length === 0) && (
          <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <p className='text-gray-600 dark:text-gray-400 mb-2'>
                No assets found
              </p>
              {searchParams.search && (
                <p className='text-sm text-gray-500 dark:text-gray-500'>
                  Try adjusting your search criteria
                </p>
              )}
            </div>
          </div>
        )}

        {/* Asset list */}
        {!isLoading && !error && assets && assets.length > 0 && (
          <div className='divide-y divide-gray-200 dark:divide-gray-700'>
            {assets.map((asset) => {
              const displayData = formatAssetForDisplay(asset, undefined, {
                showCurrency: true,
                showExchange: true,
                showSector: true,
                maxNameLength: 40,
              });

              return (
                <div
                  key={asset.id}
                  className='flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors'
                  onClick={() => handleAssetClick(asset)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleAssetClick(asset);
                    }
                  }}
                  role='button'
                  tabIndex={0}
                >
                  <div className='flex items-center space-x-3 flex-1 min-w-0'>
                    <div className='flex-shrink-0'>
                      <div className='w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center'>
                        <span className='text-sm font-bold text-primary-600 dark:text-primary-400'>
                          {displayData.symbol.substring(0, 2)}
                        </span>
                      </div>
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center space-x-2'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {displayData.symbol}
                        </p>
                        {displayData.exchange && (
                          <span className='text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded'>
                            {displayData.exchange}
                          </span>
                        )}
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400 truncate'>
                        {displayData.name}
                      </p>
                      {displayData.sector && (
                        <p className='text-xs text-gray-500 dark:text-gray-500'>
                          {displayData.sector}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='flex items-center space-x-3'>
                    {/* Price and change would go here if we had price data */}
                    <div className='text-right'>
                      <p className='text-sm text-gray-500 dark:text-gray-400'>
                        {asset.type?.toUpperCase() || 'STOCK'}
                      </p>
                      {displayData.marketCap && (
                        <p className='text-xs text-gray-500 dark:text-gray-500'>
                          {displayData.marketCap}
                        </p>
                      )}
                    </div>

                    {onAssetView && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => handleViewAsset(asset, e)}
                        aria-label={`View ${asset.symbol} details`}
                      >
                        <EyeIcon className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {showPagination && metadata && metadata.total > metadata.limit && (
          <div className='flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              Showing {(metadata.page - 1) * metadata.limit + 1} to{' '}
              {Math.min(metadata.page * metadata.limit, metadata.total)} of{' '}
              {metadata.total} assets
            </div>

            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(metadata.page - 1)}
                disabled={!metadata.hasPrev}
              >
                Previous
              </Button>

              <span className='text-sm text-gray-600 dark:text-gray-400'>
                Page {metadata.page}
              </span>

              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(metadata.page + 1)}
                disabled={!metadata.hasNext}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
