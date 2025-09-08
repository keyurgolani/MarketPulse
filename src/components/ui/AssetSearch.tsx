import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from './Input';
import { LoadingSpinner } from './LoadingSpinner';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { useAssetSearch } from '@/hooks/useAssetData';
import { AssetSearchResult } from '@/types/asset';
import { formatAssetSymbol, formatAssetName } from '@/utils/assetFormatters';

export interface AssetSearchProps {
  onSelect?: (asset: AssetSearchResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearOnSelect?: boolean;
  maxResults?: number;
  minSearchLength?: number;
}

export const AssetSearch: React.FC<AssetSearchProps> = ({
  onSelect,
  placeholder = 'Search assets...',
  className,
  disabled = false,
  clearOnSelect = true,
  maxResults = 10,
  minSearchLength = 1,
}): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { searchValue, debouncedSearchValue, setSearchValue, isSearching } =
    useDebouncedSearch('', 300);

  const {
    data: searchResults = [],
    isLoading,
    error,
  } = useAssetSearch(
    { q: debouncedSearchValue, limit: maxResults },
    { enabled: debouncedSearchValue.length >= minSearchLength }
  );

  // Show dropdown when there are results or loading
  const showDropdown =
    isOpen && (searchResults.length > 0 || isLoading || error);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  // Open dropdown when search value changes
  useEffect(() => {
    if (searchValue.length >= minSearchLength) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchValue, minSearchLength]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchValue(e.target.value);
  };

  // Handle input focus
  const handleInputFocus = (): void => {
    if (searchValue.length >= minSearchLength) {
      setIsOpen(true);
    }
  };

  // Handle input blur (with delay to allow clicks)
  const handleInputBlur = (): void => {
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  // Handle asset selection
  const handleAssetSelect = (asset: AssetSearchResult): void => {
    onSelect?.(asset);
    if (clearOnSelect) {
      setSearchValue('');
    } else {
      setSearchValue(asset.symbol);
    }
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleAssetSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clear button
  const handleClear = (): void => {
    setSearchValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  return (
    <div className={clsx('relative', className)}>
      <Input
        ref={inputRef}
        type='text'
        value={searchValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        leftIcon={<MagnifyingGlassIcon />}
        rightIcon={
          searchValue ? (
            <button
              type='button'
              onClick={handleClear}
              className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              aria-label='Clear search'
            >
              <XMarkIcon className='h-4 w-4' />
            </button>
          ) : isSearching ? (
            <LoadingSpinner size='sm' />
          ) : null
        }
        className='pr-10'
        aria-expanded={showDropdown ? 'true' : 'false'}
        aria-haspopup='listbox'
        aria-autocomplete='list'
        role='combobox'
      />

      {showDropdown && (
        <div className='absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto'>
          {isLoading && (
            <div className='flex items-center justify-center py-4'>
              <LoadingSpinner size='sm' />
              <span className='ml-2 text-sm text-gray-600 dark:text-gray-400'>
                Searching...
              </span>
            </div>
          )}

          {error && (
            <div className='px-4 py-3 text-sm text-red-600 dark:text-red-400'>
              Failed to search assets. Please try again.
            </div>
          )}

          {!isLoading &&
            !error &&
            searchResults.length === 0 &&
            debouncedSearchValue && (
              <div className='px-4 py-3 text-sm text-gray-600 dark:text-gray-400'>
                No assets found for &quot;{debouncedSearchValue}&quot;
              </div>
            )}

          {!isLoading && !error && searchResults.length > 0 && (
            <ul
              ref={listRef}
              role='listbox'
              aria-label='Asset search results'
              className='py-1'
            >
              {searchResults.map((asset, index) => (
                <li
                  key={asset.id}
                  role='option'
                  aria-selected={index === selectedIndex}
                  className={clsx(
                    'px-4 py-2 cursor-pointer transition-colors duration-150',
                    {
                      'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100':
                        index === selectedIndex,
                      'hover:bg-gray-50 dark:hover:bg-gray-700':
                        index !== selectedIndex,
                    }
                  )}
                  onClick={() => handleAssetSelect(asset)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAssetSelect(asset);
                    }
                  }}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center space-x-2'>
                        <span className='font-medium text-gray-900 dark:text-gray-100'>
                          {formatAssetSymbol(asset.symbol)}
                        </span>
                        {asset.exchange && (
                          <span className='text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded'>
                            {asset.exchange}
                          </span>
                        )}
                      </div>
                      <div className='text-sm text-gray-600 dark:text-gray-400 truncate'>
                        {formatAssetName(asset.name, 50)}
                      </div>
                      {asset.sector && (
                        <div className='text-xs text-gray-500 dark:text-gray-500 mt-0.5'>
                          {asset.sector}
                        </div>
                      )}
                    </div>
                    {asset.type && (
                      <div className='text-xs text-gray-500 dark:text-gray-400 ml-2'>
                        {asset.type.toUpperCase()}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
