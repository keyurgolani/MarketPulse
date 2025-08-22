/**
 * News Filters Component
 * Advanced filtering interface for news articles
 */

import React, { useState, useCallback } from 'react';
import type { NewsFilter, SentimentLabel, NewsCategory } from '@/types/news';

export interface NewsFiltersProps {
  /** Current filter state */
  filters: NewsFilter;
  /** Callback when filters change */
  onFiltersChange: (filters: NewsFilter) => void;
  /** Available asset symbols */
  availableAssets?: string[];
  /** Show advanced filters */
  showAdvanced?: boolean;
  /** Custom className */
  className?: string;
}

export const NewsFilters: React.FC<NewsFiltersProps> = ({
  filters,
  onFiltersChange,
  availableAssets = [],
  showAdvanced = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(showAdvanced);

  // Available categories
  const categories: { value: NewsCategory; label: string }[] = [
    { value: 'market-news', label: 'Market News' },
    { value: 'earnings', label: 'Earnings' },
    { value: 'economic-data', label: 'Economic Data' },
    { value: 'company-news', label: 'Company News' },
    { value: 'analysis', label: 'Analysis' },
    { value: 'breaking-news', label: 'Breaking News' },
    { value: 'mergers-acquisitions', label: 'M&A' },
    { value: 'ipo', label: 'IPO' },
    { value: 'dividends', label: 'Dividends' },
    { value: 'regulatory', label: 'Regulatory' },
    { value: 'technology', label: 'Technology' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'commodities', label: 'Commodities' },
    { value: 'forex', label: 'Forex' },
    { value: 'bonds', label: 'Bonds' },
  ];

  // Available sentiments
  const sentiments: { value: SentimentLabel; label: string; color: string }[] =
    [
      {
        value: 'very-positive',
        label: 'Very Positive',
        color: 'text-green-700',
      },
      { value: 'positive', label: 'Positive', color: 'text-green-600' },
      { value: 'neutral', label: 'Neutral', color: 'text-gray-600' },
      { value: 'negative', label: 'Negative', color: 'text-red-600' },
      { value: 'very-negative', label: 'Very Negative', color: 'text-red-700' },
    ];

  // Update filters
  const updateFilters = useCallback(
    (updates: Partial<NewsFilter>): void => {
      onFiltersChange({ ...filters, ...updates });
    },
    [filters, onFiltersChange]
  );

  // Toggle category
  const toggleCategory = useCallback(
    (category: NewsCategory): void => {
      const currentCategories = filters.categories || [];
      const newCategories = currentCategories.includes(category)
        ? currentCategories.filter(c => c !== category)
        : [...currentCategories, category];

      updateFilters({ categories: newCategories });
    },
    [filters.categories, updateFilters]
  );

  // Toggle sentiment
  const toggleSentiment = useCallback(
    (sentiment: SentimentLabel): void => {
      const currentSentiments = filters.sentiment || [];
      const newSentiments = currentSentiments.includes(sentiment)
        ? currentSentiments.filter(s => s !== sentiment)
        : [...currentSentiments, sentiment];

      updateFilters({ sentiment: newSentiments });
    },
    [filters.sentiment, updateFilters]
  );

  // Toggle asset
  const toggleAsset = useCallback(
    (asset: string): void => {
      const currentAssets = filters.assets || [];
      const newAssets = currentAssets.includes(asset)
        ? currentAssets.filter(a => a !== asset)
        : [...currentAssets, asset];

      updateFilters({ assets: newAssets });
    },
    [filters.assets, updateFilters]
  );

  // Clear all filters
  const clearAllFilters = useCallback((): void => {
    onFiltersChange({});
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    filters.categories?.length ||
      filters.sentiment?.length ||
      filters.assets?.length ||
      filters.sources?.length ||
      filters.dateRange ||
      filters.breakingOnly ||
      filters.keywords?.length
  );

  return (
    <div className={`news-filters ${className}`}>
      {/* Filter header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Filters
          </h3>
          {hasActiveFilters && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        </div>
      </div>

      {/* Basic filters */}
      <div className="space-y-3">
        {/* Breaking news toggle */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="breaking-only"
            checked={filters.breakingOnly || false}
            onChange={e => updateFilters({ breakingOnly: e.target.checked })}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label
            htmlFor="breaking-only"
            className="text-sm text-gray-900 dark:text-white cursor-pointer"
          >
            Breaking news only
          </label>
        </div>

        {/* Quick sentiment filters */}
        <div>
          <div className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sentiment
          </div>
          <div className="flex flex-wrap gap-1">
            {sentiments.map(sentiment => (
              <button
                key={sentiment.value}
                onClick={() => toggleSentiment(sentiment.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filters.sentiment?.includes(sentiment.value)
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {sentiment.label}
              </button>
            ))}
          </div>
        </div>

        {/* Asset filters */}
        {availableAssets.length > 0 && (
          <div>
            <div className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assets
            </div>
            <div className="flex flex-wrap gap-1">
              {availableAssets
                .slice(0, isExpanded ? availableAssets.length : 6)
                .map(asset => (
                  <button
                    key={asset}
                    onClick={() => toggleAsset(asset)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      filters.assets?.includes(asset)
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              {!isExpanded && availableAssets.length > 6 && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  +{availableAssets.length - 6} more
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Advanced filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Categories */}
          <div>
            <div className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categories
            </div>
            <div className="grid grid-cols-2 gap-1">
              {categories.map(category => (
                <button
                  key={category.value}
                  onClick={() => toggleCategory(category.value)}
                  className={`px-2 py-1 text-xs rounded text-left transition-colors ${
                    filters.categories?.includes(category.value)
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label
              htmlFor="date-start"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                id="date-start"
                type="date"
                value={
                  filters.dateRange?.start.toISOString().split('T')[0] || ''
                }
                onChange={e => {
                  const start = new Date(e.target.value);
                  updateFilters({
                    dateRange: {
                      start,
                      end: filters.dateRange?.end || new Date(),
                    },
                  });
                }}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                id="date-end"
                type="date"
                value={filters.dateRange?.end.toISOString().split('T')[0] || ''}
                onChange={e => {
                  const end = new Date(e.target.value);
                  updateFilters({
                    dateRange: {
                      start:
                        filters.dateRange?.start ||
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                      end,
                    },
                  });
                }}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label
              htmlFor="keywords-input"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Keywords (comma-separated)
            </label>
            <input
              id="keywords-input"
              type="text"
              value={filters.keywords?.join(', ') || ''}
              onChange={e => {
                const keywords = e.target.value
                  .split(',')
                  .map(k => k.trim())
                  .filter(k => k.length > 0);
                updateFilters({
                  keywords: keywords.length > 0 ? keywords : undefined,
                });
              }}
              placeholder="e.g., earnings, merger, acquisition"
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Minimum reliability */}
          <div>
            <label
              htmlFor="reliability-slider"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Minimum Source Reliability: {filters.minReliability || 0}%
            </label>
            <input
              id="reliability-slider"
              type="range"
              min="0"
              max="100"
              step="10"
              value={filters.minReliability || 0}
              onChange={e =>
                updateFilters({ minReliability: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Active Filters:
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.categories?.map(category => (
              <span
                key={category}
                className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded"
              >
                {categories.find(c => c.value === category)?.label}
                <button
                  onClick={() => toggleCategory(category)}
                  className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.sentiment?.map(sentiment => (
              <span
                key={sentiment}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
              >
                {sentiments.find(s => s.value === sentiment)?.label}
                <button
                  onClick={() => toggleSentiment(sentiment)}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.assets?.map(asset => (
              <span
                key={asset}
                className="inline-flex items-center px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded"
              >
                {asset}
                <button
                  onClick={() => toggleAsset(asset)}
                  className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsFilters;
