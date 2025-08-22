/**
 * News Updates Hook
 * Manages real-time news updates via WebSocket and polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { newsService } from '@/services/newsService';
import type { NewsArticle, NewsFilter } from '@/types/news';

export interface NewsUpdatesConfig {
  /** Enable real-time updates */
  realTime?: boolean;
  /** Polling interval in milliseconds (fallback) */
  pollingInterval?: number;
  /** Maximum articles to keep in memory */
  maxArticles?: number;
  /** Auto-refresh on focus */
  refreshOnFocus?: boolean;
  /** Filters to apply */
  filters?: NewsFilter;
}

export interface NewsUpdatesState {
  /** Current articles */
  articles: NewsArticle[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Last update timestamp */
  lastUpdate: Date | null;
  /** New articles count since last view */
  newCount: number;
  /** Connection status */
  isConnected: boolean;
}

export interface NewsUpdatesActions {
  /** Refresh articles manually */
  refresh: () => Promise<void>;
  /** Mark articles as viewed */
  markAsViewed: () => void;
  /** Add article to list */
  addArticle: (article: NewsArticle) => void;
  /** Remove article from list */
  removeArticle: (articleId: string) => void;
  /** Clear all articles */
  clearArticles: () => void;
  /** Update filters */
  updateFilters: (filters: NewsFilter) => void;
}

export function useNewsUpdates(
  config: NewsUpdatesConfig = {}
): NewsUpdatesState & NewsUpdatesActions {
  const {
    realTime = true,
    pollingInterval = 300000, // 5 minutes
    maxArticles = 100,
    refreshOnFocus = true,
    filters = {},
  } = config;

  const [state, setState] = useState<NewsUpdatesState>({
    articles: [],
    isLoading: true,
    error: null,
    lastUpdate: null,
    newCount: 0,
    isConnected: false,
  });

  const [currentFilters, setCurrentFilters] = useState<NewsFilter>(filters);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastViewedRef = useRef<Date>(new Date());

  // WebSocket connection for real-time updates (simplified for now)
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage] = useState<string | null>(null);
  const sendMessage = useCallback((message: string): void => {
    // TODO: Implement WebSocket message sending
    console.log('WebSocket message:', message);
  }, []);

  // Load initial articles
  const loadArticles = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await newsService.getNews({
        limit: maxArticles,
        symbols: currentFilters.assets,
        category: currentFilters.categories?.[0], // API supports single category
        sentiment: currentFilters.sentiment?.[0], // API supports single sentiment
      });

      setState(prev => ({
        ...prev,
        articles: response.articles,
        isLoading: false,
        lastUpdate: new Date(),
        error: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load news';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    }
  }, [currentFilters, maxArticles]);

  // Refresh articles
  const refresh = useCallback(async (): Promise<void> => {
    await loadArticles();
  }, [loadArticles]);

  // Mark articles as viewed
  const markAsViewed = useCallback((): void => {
    lastViewedRef.current = new Date();
    setState(prev => ({ ...prev, newCount: 0 }));
  }, []);

  // Add new article
  const addArticle = useCallback(
    (article: NewsArticle): void => {
      setState(prev => {
        // Check if article already exists
        if (prev.articles.some(a => a.id === article.id)) {
          return prev;
        }

        // Add article and sort by publish date
        const newArticles = [article, ...prev.articles]
          .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
          .slice(0, maxArticles);

        // Count new articles since last viewed
        const newCount = newArticles.filter(
          a => a.publishedAt > lastViewedRef.current
        ).length;

        return {
          ...prev,
          articles: newArticles,
          newCount,
          lastUpdate: new Date(),
        };
      });
    },
    [maxArticles]
  );

  // Remove article
  const removeArticle = useCallback((articleId: string): void => {
    setState(prev => ({
      ...prev,
      articles: prev.articles.filter(a => a.id !== articleId),
    }));
  }, []);

  // Clear all articles
  const clearArticles = useCallback((): void => {
    setState(prev => ({
      ...prev,
      articles: [],
      newCount: 0,
    }));
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: NewsFilter): void => {
    setCurrentFilters(newFilters);
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    try {
      const data = JSON.parse(lastMessage);

      switch (data.type) {
        case 'news_article':
          // New article received
          if (data.article) {
            addArticle({
              ...data.article,
              publishedAt: new Date(data.article.publishedAt),
            });
          }
          break;

        case 'news_update':
          // Article updated
          if (data.article) {
            setState(prev => ({
              ...prev,
              articles: prev.articles.map(article =>
                article.id === data.article.id
                  ? {
                      ...data.article,
                      publishedAt: new Date(data.article.publishedAt),
                    }
                  : article
              ),
            }));
          }
          break;

        case 'news_delete':
          // Article deleted
          if (data.articleId) {
            removeArticle(data.articleId);
          }
          break;

        case 'news_bulk_update':
          // Bulk update - refresh all
          refresh();
          break;

        default:
          console.log('Unknown news WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [lastMessage, addArticle, removeArticle, refresh]);

  // Update connection status (simplified for now)
  useEffect(() => {
    setState(prev => ({ ...prev, isConnected: false })); // WebSocket not implemented yet
    setIsConnected(false);
  }, []);

  // Subscribe to news updates when connected (simplified for now)
  useEffect(() => {
    if (isConnected && sendMessage) {
      // Subscribe to news updates with current filters
      sendMessage(
        JSON.stringify({
          type: 'subscribe_news',
          filters: currentFilters,
        })
      );
    }
  }, [isConnected, sendMessage, currentFilters]);

  // Set up polling fallback
  useEffect((): (() => void) | void => {
    if (!realTime || isConnected) {
      // Clear polling if real-time is disabled or WebSocket is connected
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Set up polling
    pollingRef.current = setInterval(refresh, pollingInterval);

    return (): void => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [realTime, isConnected, pollingInterval, refresh]);

  // Handle window focus for refresh
  useEffect((): (() => void) | void => {
    if (!refreshOnFocus) return;

    const handleFocus = (): void => {
      // Refresh if it's been more than 5 minutes since last update
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (!state.lastUpdate || state.lastUpdate < fiveMinutesAgo) {
        refresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return (): void => window.removeEventListener('focus', handleFocus);
  }, [refreshOnFocus, refresh, state.lastUpdate]);

  // Load articles when filters change
  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Cleanup on unmount
  useEffect((): (() => void) => {
    return (): void => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    // State
    articles: state.articles,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    newCount: state.newCount,
    isConnected: state.isConnected,

    // Actions
    refresh,
    markAsViewed,
    addArticle,
    removeArticle,
    clearArticles,
    updateFilters,
  };
}

export default useNewsUpdates;
