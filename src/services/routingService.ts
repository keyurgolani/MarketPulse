/**
 * Routing Service
 * Handles dashboard URL management, bookmarking, and sharing
 */

import type { Dashboard } from '@/types/dashboard';

export interface DashboardUrlParams {
  dashboardId?: string;
  edit?: boolean;
  tab?: string;
  widget?: string;
  view?: string;
  filter?: string;
}

export interface ShareableUrl {
  url: string;
  shortUrl?: string;
  expiresAt?: Date;
  permissions?: 'view' | 'edit';
}

export interface BookmarkData {
  id: string;
  title: string;
  url: string;
  dashboardId: string;
  createdAt: Date;
  tags: string[];
}

class RoutingService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = window.location.origin;
  }

  /**
   * Generate dashboard URL with parameters
   */
  generateDashboardUrl(params: DashboardUrlParams): string {
    const { dashboardId, edit, tab, widget, view, filter } = params;

    let path = '/dashboard';
    if (dashboardId) {
      path += `/${dashboardId}`;
    }

    if (edit) {
      path += '/edit';
    }

    const searchParams = new URLSearchParams();
    if (tab) searchParams.set('tab', tab);
    if (widget) searchParams.set('widget', widget);
    if (view) searchParams.set('view', view);
    if (filter) searchParams.set('filter', filter);

    const queryString = searchParams.toString();
    return `${this.baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Parse dashboard URL parameters
   */
  parseDashboardUrl(url: string): DashboardUrlParams {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      const params: DashboardUrlParams = {};

      // Extract dashboard ID from path
      if (pathParts.length >= 2 && pathParts[0] === 'dashboard') {
        params.dashboardId = pathParts[1];
      }

      // Check for edit mode
      if (pathParts.includes('edit')) {
        params.edit = true;
      }

      // Extract query parameters
      const searchParams = urlObj.searchParams;
      if (searchParams.get('tab')) {
        params.tab = searchParams.get('tab')!;
      }
      if (searchParams.get('widget')) {
        params.widget = searchParams.get('widget')!;
      }
      if (searchParams.get('view')) {
        params.view = searchParams.get('view')!;
      }
      if (searchParams.get('filter')) {
        params.filter = searchParams.get('filter')!;
      }

      return params;
    } catch {
      return {};
    }
  }

  /**
   * Validate dashboard URL
   */
  validateDashboardUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // Must start with /dashboard
      if (pathParts.length === 0 || pathParts[0] !== 'dashboard') {
        return false;
      }

      // If dashboard ID is provided, validate format
      if (pathParts.length >= 2) {
        const dashboardId = pathParts[1];
        // Basic UUID validation (simplified)
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(dashboardId) && dashboardId !== 'new') {
          return false;
        }
      }

      // Validate allowed path segments
      const allowedSegments = ['dashboard', 'edit', 'share'];
      for (const segment of pathParts) {
        if (
          !allowedSegments.includes(segment) &&
          !this.isValidDashboardId(segment)
        ) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create shareable URL for dashboard
   */
  createShareableUrl(
    dashboard: Dashboard,
    options: {
      permissions?: 'view' | 'edit';
      expiresIn?: number; // hours
      includeFilters?: boolean;
    } = {}
  ): ShareableUrl {
    const { permissions = 'view', expiresIn } = options;

    const params: DashboardUrlParams = {
      dashboardId: dashboard.id,
    };

    if (permissions === 'edit') {
      params.edit = true;
    }

    const url = this.generateDashboardUrl(params);

    const shareableUrl: ShareableUrl = {
      url,
      permissions,
    };

    if (expiresIn) {
      shareableUrl.expiresAt = new Date(
        Date.now() + expiresIn * 60 * 60 * 1000
      );
    }

    return shareableUrl;
  }

  /**
   * Create bookmark for dashboard
   */
  createBookmark(dashboard: Dashboard, customTitle?: string): BookmarkData {
    const bookmark: BookmarkData = {
      id: `bookmark-${dashboard.id}-${Date.now()}`,
      title: customTitle || dashboard.name,
      url: this.generateDashboardUrl({ dashboardId: dashboard.id }),
      dashboardId: dashboard.id,
      createdAt: new Date(),
      tags: dashboard.tags || [],
    };

    // Save to localStorage
    this.saveBookmark(bookmark);

    return bookmark;
  }

  /**
   * Get all bookmarks
   */
  getBookmarks(): BookmarkData[] {
    try {
      // Check if we're in a browser environment and localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }

      const bookmarks = window.localStorage.getItem('dashboard-bookmarks');
      return bookmarks ? JSON.parse(bookmarks) : [];
    } catch (error) {
      console.error('Failed to get bookmarks:', error);
      return [];
    }
  }

  /**
   * Save bookmark to localStorage
   */
  private saveBookmark(bookmark: BookmarkData): void {
    try {
      // Check if we're in a browser environment and localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const existingBookmarks = this.getBookmarks();
      const bookmarkIndex = existingBookmarks.findIndex(
        b => b.id === bookmark.id
      );

      if (bookmarkIndex >= 0) {
        existingBookmarks[bookmarkIndex] = bookmark;
      } else {
        existingBookmarks.push(bookmark);
      }

      window.localStorage.setItem(
        'dashboard-bookmarks',
        JSON.stringify(existingBookmarks)
      );
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    }
  }

  /**
   * Delete bookmark
   */
  deleteBookmark(bookmarkId: string): boolean {
    try {
      // Check if we're in a browser environment and localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      const bookmarks = this.getBookmarks();
      const filteredBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
      window.localStorage.setItem(
        'dashboard-bookmarks',
        JSON.stringify(filteredBookmarks)
      );
      return true;
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      return false;
    }
  }

  /**
   * Navigate to dashboard with parameters
   */
  navigateToDashboard(params: DashboardUrlParams): void {
    const url = this.generateDashboardUrl(params);
    window.history.pushState(null, '', url);
  }

  /**
   * Replace current URL with dashboard parameters
   */
  replaceDashboardUrl(params: DashboardUrlParams): void {
    const url = this.generateDashboardUrl(params);
    window.history.replaceState(null, '', url);
  }

  /**
   * Get current dashboard parameters from URL
   */
  getCurrentDashboardParams(): DashboardUrlParams {
    return this.parseDashboardUrl(window.location.href);
  }

  /**
   * Copy dashboard URL to clipboard
   */
  async copyDashboardUrl(params: DashboardUrlParams): Promise<boolean> {
    try {
      const url = this.generateDashboardUrl(params);
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error);
      return false;
    }
  }

  /**
   * Generate QR code URL for dashboard sharing
   */
  generateQRCodeUrl(dashboard: Dashboard): string {
    const url = this.generateDashboardUrl({ dashboardId: dashboard.id });
    // Using a free QR code service - in production, you might want to use your own
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }

  /**
   * Validate dashboard ID format
   */
  private isValidDashboardId(id: string): boolean {
    // Basic UUID validation or special cases
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) || id === 'new' || id === 'default';
  }

  /**
   * Get navigation history
   */
  getNavigationHistory(): DashboardUrlParams[] {
    try {
      const history = sessionStorage.getItem('dashboard-navigation-history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Failed to load navigation history:', error);
      return [];
    }
  }

  /**
   * Add to navigation history
   */
  addToNavigationHistory(params: DashboardUrlParams): void {
    try {
      const history = this.getNavigationHistory();

      // Don't add duplicate consecutive entries
      const lastEntry = history[history.length - 1];
      if (lastEntry && lastEntry.dashboardId === params.dashboardId) {
        return;
      }

      history.push(params);

      // Keep only last 50 entries
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }

      sessionStorage.setItem(
        'dashboard-navigation-history',
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Failed to save navigation history:', error);
    }
  }

  /**
   * Clear navigation history
   */
  clearNavigationHistory(): void {
    try {
      sessionStorage.removeItem('dashboard-navigation-history');
    } catch (error) {
      console.error('Failed to clear navigation history:', error);
    }
  }
}

export const routingService = new RoutingService();
export default routingService;
