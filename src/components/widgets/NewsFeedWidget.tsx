/**
 * News Feed Widget Component
 * Displays financial news articles with filtering and search
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { newsService } from '@/services/newsService';
import { Loading } from '@/components/ui/Loading';
import type { Widget } from '@/types/widget';
import type { NewsArticle, SentimentAnalysis } from '@/types/news';

export interface NewsFeedWidgetProps {
  /** Widget configuration */
  widget: Widget;
  /** Whether widget is in edit mode */
  isEditing?: boolean;
  /** Callback when widget needs update */
  onUpdate?: (updates: Partial<Widget>) => void;
  /** Optional className */
  className?: string;
}

export const NewsFeedWidget: React.FC<NewsFeedWidgetProps> = ({
  widget,
  isEditing = false,
  className = '',
}) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract configuration
  const config = widget.config;
  const symbols = useMemo(() => config.assets || [], [config.assets]);
  const refreshInterval = config.refreshInterval || 300000; // 5 minutes
  const customSettings = (config.customSettings || {}) as Record<
    string,
    unknown
  >;

  // News configuration
  const maxArticles = (customSettings.maxArticles as number) || 10;
  const showImages = customSettings.showImages ?? true;
  const showSummary = customSettings.showSummary ?? true;
  const enableSearch = customSettings.enableSearch ?? true;
  const filterByAssets = customSettings.filterByAssets ?? false;

  // Load news articles
  const loadNews = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      let response;
      if (filterByAssets && symbols.length > 0) {
        // Get asset-specific news for first symbol
        response = await newsService.getAssetNews(symbols[0], {
          limit: maxArticles,
        });
      } else {
        // Get general market news
        response = await newsService.getNews({ limit: maxArticles });
      }

      setArticles(response.articles.slice(0, maxArticles));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load news:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbols, maxArticles, filterByAssets]);

  // Initial load
  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Set up refresh interval
  useEffect((): (() => void) | void => {
    if (!refreshInterval || isEditing) return;

    const interval = setInterval(loadNews, refreshInterval);
    return () => clearInterval(interval);
  }, [loadNews, refreshInterval, isEditing]);

  // Filter articles based on search query
  const filteredArticles = useMemo((): NewsArticle[] => {
    if (!searchQuery.trim()) return articles;

    const query = searchQuery.toLowerCase();
    return articles.filter(
      article =>
        article.title.toLowerCase().includes(query) ||
        article.summary?.toLowerCase().includes(query) ||
        article.source.name.toLowerCase().includes(query)
    );
  }, [articles, searchQuery]);

  // Format time ago
  const formatTimeAgo = useCallback((publishedAt: string): string => {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffMs = now.getTime() - published.getTime();
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

  // Get sentiment color class
  const getSentimentColorClass = useCallback(
    (sentiment?: SentimentAnalysis): string => {
      if (!sentiment) return 'text-gray-600 dark:text-gray-400';

      switch (sentiment.label) {
        case 'positive':
        case 'very-positive':
          return 'text-green-600 dark:text-green-400';
        case 'negative':
        case 'very-negative':
          return 'text-red-600 dark:text-red-400';
        case 'neutral':
        default:
          return 'text-gray-600 dark:text-gray-400';
      }
    },
    []
  );

  // Render loading state
  if (isLoading) {
    return (
      <div className={`news-feed-widget ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loading text="Loading news..." />
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`news-feed-widget ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-red-600 dark:text-red-400">
          <div className="text-sm font-medium">Failed to load news</div>
          <div className="text-xs mt-1">{error}</div>
          <button
            onClick={loadNews}
            className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!filteredArticles.length) {
    return (
      <div className={`news-feed-widget ${className}`}>
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <div className="text-sm">
              {searchQuery
                ? 'No matching articles'
                : 'No news articles available'}
            </div>
            <div className="text-xs mt-1">
              {searchQuery
                ? 'Try a different search term'
                : 'Check back later for updates'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`news-feed-widget ${className}`}>
      {/* Search bar */}
      {enableSearch && articles.length > 3 && (
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search news articles..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {/* News articles */}
      <div className="space-y-4">
        {filteredArticles.map((article, index) => (
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
                  {article.sentiment && (
                    <div
                      className={`ml-2 flex-shrink-0 ${getSentimentColorClass(article.sentiment)}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-current" />
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
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
                    {formatTimeAgo(article.publishedAt.toISOString())}
                  </time>
                </div>

                {/* Related assets */}
                {article.relatedAssets && article.relatedAssets.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {article.relatedAssets.slice(0, 3).map(asset => (
                      <span
                        key={asset}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                      >
                        {asset}
                      </span>
                    ))}
                    {article.relatedAssets.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        +{article.relatedAssets.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Load more button */}
      {articles.length >= maxArticles && (
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              // TODO: Implement load more functionality
              console.log('Load more articles');
            }}
            className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            Load more articles
          </button>
        </div>
      )}

      {/* News summary */}
      {articles.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-600 dark:text-gray-400">
                Total Articles
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {articles.length}
              </div>
            </div>
            <div>
              <div className="text-gray-600 dark:text-gray-400">Sources</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {new Set(articles.map(a => a.source.name)).size}
              </div>
            </div>
            {articles.some(a => a.sentiment) && (
              <>
                <div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Positive
                  </div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {
                      articles.filter(
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
                      articles.filter(
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

export default NewsFeedWidget;
