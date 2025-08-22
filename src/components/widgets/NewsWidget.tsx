/**
 * Enhanced News Widget Component
 * Displays financial news articles with advanced filtering, sentiment analysis, and asset tagging
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { newsService } from '@/services/newsService';
import { Loading } from '@/components/ui/Loading';
import type { Widget } from '@/types/widget';
import type {
  NewsArticle,
  SentimentAnalysis,
  SentimentLabel,
  NewsCategory,
} from '@/types/news';

export interface NewsWidgetProps {
  /** Widget configuration */
  widget: Widget;
  /** Whether widget is in edit mode */
  isEditing?: boolean;
  /** Callback when widget needs update */
  onUpdate?: (updates: Partial<Widget>) => void;
  /** Optional className */
  className?: string;
}

interface NewsState {
  articles: NewsArticle[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  hasMore: boolean;
}

export const NewsWidget: React.FC<NewsWidgetProps> = ({
  widget,
  isEditing = false,
  onUpdate,
  className = '',
}) => {
  const [state, setState] = useState<NewsState>({
    articles: [],
    isLoading: true,
    error: null,
    totalCount: 0,
    currentPage: 1,
    hasMore: false,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSentiment, setSelectedSentiment] = useState<
    SentimentLabel | ''
  >('');

  // Extract configuration
  const config = widget.config;
  const symbols = useMemo(() => config.assets || [], [config.assets]);
  const refreshInterval = config.refreshInterval || 900000; // 15 minutes
  const customSettings = (config.customSettings || {}) as Record<
    string,
    unknown
  >;

  // News configuration
  const maxArticles = (customSettings.maxArticles as number) || 20;
  const showImages = customSettings.showImages ?? true;
  const showSummary = customSettings.showSummary ?? true;
  const enableSearch = customSettings.enableSearch ?? true;
  const enableFiltering = customSettings.enableFiltering ?? true;
  const showSentiment = customSettings.showSentiment ?? true;
  const showAssetTags = customSettings.showAssetTags ?? true;
  const filterByAssets = customSettings.filterByAssets ?? false;
  const autoRefresh = customSettings.autoRefresh ?? true;

  // Available categories for filtering
  const categories: { value: string; label: string }[] = [
    { value: '', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'business', label: 'Business' },
    { value: 'technology', label: 'Technology' },
    { value: 'markets', label: 'Markets' },
    { value: 'earnings', label: 'Earnings' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'forex', label: 'Forex' },
  ];

  // Available sentiment filters
  const sentiments: {
    value: SentimentLabel | '';
    label: string;
    color: string;
  }[] = [
    { value: '', label: 'All Sentiment', color: 'text-gray-600' },
    { value: 'very-positive', label: 'Very Positive', color: 'text-green-600' },
    { value: 'positive', label: 'Positive', color: 'text-green-500' },
    { value: 'neutral', label: 'Neutral', color: 'text-gray-500' },
    { value: 'negative', label: 'Negative', color: 'text-red-500' },
    { value: 'very-negative', label: 'Very Negative', color: 'text-red-600' },
  ];

  // Load news articles
  const loadNews = useCallback(
    async (page = 1, append = false): Promise<void> => {
      try {
        setState(prev => ({ ...prev, error: null, isLoading: !append }));

        let response;
        if (filterByAssets && symbols.length > 0) {
          // Get asset-specific news for first symbol
          response = await newsService.getAssetNews(symbols[0], {
            category: selectedCategory || undefined,
            sentiment: selectedSentiment || undefined,
            search: searchQuery || undefined,
            limit: maxArticles,
            page,
            include_analysis: true,
          });
        } else if (searchQuery) {
          // Search news
          response = await newsService.searchNews(
            searchQuery,
            {
              categories: selectedCategory
                ? [selectedCategory as NewsCategory]
                : undefined,
              sentiment: selectedSentiment ? [selectedSentiment] : undefined,
              assets: symbols.length > 0 ? symbols : undefined,
            },
            maxArticles,
            page
          );
        } else {
          // Get general news with filters
          response = await newsService.getNews({
            symbols: symbols.length > 0 ? symbols : undefined,
            category: selectedCategory || undefined,
            sentiment: selectedSentiment || undefined,
            limit: maxArticles,
            page,
            include_analysis: symbols.length > 0,
          });
        }

        setState(prev => ({
          ...prev,
          articles: append
            ? [...prev.articles, ...response.articles]
            : response.articles,
          totalCount: response.total,
          currentPage: page,
          hasMore: response.articles.length === maxArticles,
          isLoading: false,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        console.error('Failed to load news:', err);
      }
    },
    [
      symbols,
      maxArticles,
      filterByAssets,
      selectedCategory,
      selectedSentiment,
      searchQuery,
    ]
  );

  // Load more articles
  const loadMore = useCallback((): void => {
    if (!state.isLoading && state.hasMore) {
      loadNews(state.currentPage + 1, true);
    }
  }, [loadNews, state.isLoading, state.hasMore, state.currentPage]);

  // Handle search
  const handleSearch = useCallback(
    (query: string): void => {
      setSearchQuery(query);
      loadNews(1, false); // Reset to first page
    },
    [loadNews]
  );

  // Initial load
  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Set up refresh interval
  useEffect((): (() => void) | void => {
    if (!refreshInterval || isEditing || !autoRefresh) return;

    const interval = setInterval(() => loadNews(1, false), refreshInterval);
    return () => clearInterval(interval);
  }, [loadNews, refreshInterval, isEditing, autoRefresh]);

  // Format time ago
  const formatTimeAgo = useCallback((publishedAt: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - publishedAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours >= 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours >= 1) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes >= 1) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }, []);

  // Get sentiment display
  const getSentimentDisplay = useCallback(
    (
      sentiment?: SentimentAnalysis
    ): {
      color: string;
      label: string;
      icon: string;
    } => {
      if (!sentiment)
        return { color: 'text-gray-400', label: 'Unknown', icon: '○' };

      switch (sentiment.label) {
        case 'very-positive':
          return {
            color: 'text-green-600 dark:text-green-400',
            label: 'Very Positive',
            icon: '●●',
          };
        case 'positive':
          return {
            color: 'text-green-500 dark:text-green-400',
            label: 'Positive',
            icon: '●',
          };
        case 'negative':
          return {
            color: 'text-red-500 dark:text-red-400',
            label: 'Negative',
            icon: '●',
          };
        case 'very-negative':
          return {
            color: 'text-red-600 dark:text-red-400',
            label: 'Very Negative',
            icon: '●●',
          };
        case 'neutral':
        default:
          return {
            color: 'text-gray-500 dark:text-gray-400',
            label: 'Neutral',
            icon: '○',
          };
      }
    },
    []
  );

  // Render loading state
  if (state.isLoading && state.articles.length === 0) {
    return (
      <div className={`news-widget ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loading text="Loading news..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (state.error && state.articles.length === 0) {
    return (
      <div className={`news-widget ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-red-600 dark:text-red-400">
          <div className="text-sm font-medium">Failed to load news</div>
          <div className="text-xs mt-1">{state.error}</div>
          <button
            onClick={() => loadNews()}
            className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`news-widget ${className}`}>
      {/* Filters and Search */}
      {(enableSearch || enableFiltering) && (
        <div className="mb-4 space-y-3">
          {/* Search bar */}
          {enableSearch && (
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search news articles..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Filter controls */}
          {enableFiltering && (
            <div className="flex flex-wrap gap-2">
              {/* Category filter */}
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {/* Sentiment filter */}
              {showSentiment && (
                <select
                  value={selectedSentiment}
                  onChange={e =>
                    setSelectedSentiment(e.target.value as SentimentLabel | '')
                  }
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {sentiments.map(sent => (
                    <option key={sent.value} value={sent.value}>
                      {sent.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Clear filters */}
              {(selectedCategory || selectedSentiment || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedSentiment('');
                    setSearchQuery('');
                    loadNews(1, false);
                  }}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Articles count and refresh */}
      {state.articles.length > 0 && (
        <div className="flex items-center justify-between mb-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{state.totalCount} articles found</span>
          <button
            onClick={() => loadNews(1, false)}
            disabled={state.isLoading}
            className="px-2 py-1 text-xs hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            {state.isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      {/* News articles */}
      {state.articles.length > 0 ? (
        <div className="space-y-4">
          {state.articles.map((article, index) => (
            <article
              key={`${article.id}-${index}`}
              className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex space-x-3">
                {/* Article image */}
                {showImages && article.imageUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-16 h-16 object-cover rounded-md"
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Article content */}
                <div className="flex-1 min-w-0">
                  {/* Article header */}
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {article.title}
                      </a>
                    </h4>

                    {/* Sentiment indicator */}
                    {showSentiment && article.sentiment && (
                      <div className="ml-2 flex-shrink-0 flex items-center space-x-1">
                        <span
                          className={`text-xs ${getSentimentDisplay(article.sentiment).color}`}
                          title={`${getSentimentDisplay(article.sentiment).label} (${Math.round(article.sentiment.confidence * 100)}% confidence)`}
                        >
                          {getSentimentDisplay(article.sentiment).icon}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Article summary */}
                  {showSummary && article.summary && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {article.summary}
                    </p>
                  )}

                  {/* Article metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{article.source.name}</span>
                      {article.author && (
                        <>
                          <span>•</span>
                          <span>{article.author}</span>
                        </>
                      )}
                    </div>
                    <time dateTime={article.publishedAt.toISOString()}>
                      {formatTimeAgo(article.publishedAt)}
                    </time>
                  </div>

                  {/* Related assets */}
                  {showAssetTags &&
                    article.relatedAssets &&
                    article.relatedAssets.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {article.relatedAssets.slice(0, 5).map(asset => (
                          <span
                            key={asset}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            onClick={() => {
                              // Add asset to filter
                              if (onUpdate) {
                                const newAssets = [...symbols];
                                if (!newAssets.includes(asset)) {
                                  newAssets.push(asset);
                                  onUpdate({
                                    config: {
                                      ...config,
                                      assets: newAssets,
                                    },
                                  });
                                }
                              }
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                // Add asset to filter
                                if (onUpdate) {
                                  const newAssets = [...symbols];
                                  if (!newAssets.includes(asset)) {
                                    newAssets.push(asset);
                                    onUpdate({
                                      config: {
                                        ...config,
                                        assets: newAssets,
                                      },
                                    });
                                  }
                                }
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            title={`Click to add ${asset} to watchlist`}
                          >
                            {asset}
                          </span>
                        ))}
                        {article.relatedAssets.length > 5 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            +{article.relatedAssets.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-sm">
              {searchQuery || selectedCategory || selectedSentiment
                ? 'No matching articles'
                : 'No news articles available'}
            </div>
            <div className="text-xs mt-1">
              {searchQuery || selectedCategory || selectedSentiment
                ? 'Try adjusting your filters'
                : 'Check back later for updates'}
            </div>
          </div>
        </div>
      )}

      {/* Load more button */}
      {state.hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={state.isLoading}
            className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            {state.isLoading ? 'Loading...' : 'Load more articles'}
          </button>
        </div>
      )}

      {/* News summary */}
      {state.articles.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-600 dark:text-gray-400">
                Total Articles
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {state.totalCount}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Sources</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {new Set(state.articles.map(a => a.source.name)).size}
              </div>
            </div>
            {showSentiment && state.articles.some(a => a.sentiment) && (
              <>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Positive
                  </div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {
                      state.articles.filter(
                        a =>
                          a.sentiment?.label === 'positive' ||
                          a.sentiment?.label === 'very-positive'
                      ).length
                    }
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Negative
                  </div>
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    {
                      state.articles.filter(
                        a =>
                          a.sentiment?.label === 'negative' ||
                          a.sentiment?.label === 'very-negative'
                      ).length
                    }
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Last updated indicator */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default NewsWidget;
