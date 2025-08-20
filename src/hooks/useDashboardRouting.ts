/**
 * Dashboard Routing Hook
 * Provides routing utilities for dashboard navigation and URL management
 */

import { useCallback } from 'react';
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  routingService,
  type DashboardUrlParams,
} from '@/services/routingService';
import type { Dashboard } from '@/types/dashboard';

export interface DashboardRoutingHook {
  // Current URL state
  currentParams: DashboardUrlParams;
  dashboardId: string | undefined;
  isEditMode: boolean;
  currentTab: string | null;
  currentWidget: string | null;

  // Navigation functions
  navigateToDashboard: (
    dashboardId: string,
    options?: NavigationOptions
  ) => void;
  navigateToEdit: (dashboardId: string) => void;
  navigateToView: (dashboardId: string) => void;
  goBack: () => void;
  goForward: () => void;

  // URL management
  updateUrl: (params: Partial<DashboardUrlParams>, replace?: boolean) => void;
  generateShareUrl: (dashboard: Dashboard, options?: ShareOptions) => string;
  copyCurrentUrl: () => Promise<boolean>;

  // Bookmarks
  bookmarkCurrent: (title?: string) => boolean;
  getBookmarks: () => Array<{
    id: string;
    title: string;
    url: string;
    dashboardId: string;
    createdAt: Date;
    tags: string[];
  }>;

  // History
  getNavigationHistory: () => DashboardUrlParams[];
  clearHistory: () => void;
}

export interface NavigationOptions {
  edit?: boolean;
  tab?: string;
  widget?: string;
  view?: string;
  filter?: string;
  replace?: boolean;
}

export interface ShareOptions {
  permissions?: 'view' | 'edit';
  expiresIn?: number;
  includeFilters?: boolean;
}

export const useDashboardRouting = (): DashboardRoutingHook => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // Parse current URL parameters
  const currentParams = routingService.parseDashboardUrl(
    window.location.origin + location.pathname + location.search
  );

  const dashboardId = params.dashboardId;
  const isEditMode =
    location.pathname.includes('/edit') || searchParams.get('edit') === 'true';
  const currentTab = searchParams.get('tab');
  const currentWidget = searchParams.get('widget');

  // Navigation functions
  const navigateToDashboard = useCallback(
    (targetDashboardId: string, options: NavigationOptions = {}): void => {
      const {
        edit = false,
        tab,
        widget,
        view,
        filter,
        replace = false,
      } = options;

      const urlParams: DashboardUrlParams = {
        dashboardId: targetDashboardId,
        edit,
        tab,
        widget,
        view,
        filter,
      };

      const url = routingService.generateDashboardUrl(urlParams);
      const relativePath = url.replace(window.location.origin, '');

      navigate(relativePath, { replace });

      // Add to navigation history
      routingService.addToNavigationHistory(urlParams);
    },
    [navigate]
  );

  const navigateToEdit = useCallback(
    (targetDashboardId: string): void => {
      navigateToDashboard(targetDashboardId, { edit: true });
    },
    [navigateToDashboard]
  );

  const navigateToView = useCallback(
    (targetDashboardId: string): void => {
      navigateToDashboard(targetDashboardId, { edit: false });
    },
    [navigateToDashboard]
  );

  const goBack = useCallback((): void => {
    window.history.back();
  }, []);

  const goForward = useCallback((): void => {
    window.history.forward();
  }, []);

  // URL management
  const updateUrl = useCallback(
    (newParams: Partial<DashboardUrlParams>, replace = false): void => {
      const updatedParams = { ...currentParams, ...newParams };
      const url = routingService.generateDashboardUrl(updatedParams);
      const relativePath = url.replace(window.location.origin, '');

      navigate(relativePath, { replace });

      if (!replace) {
        routingService.addToNavigationHistory(updatedParams);
      }
    },
    [currentParams, navigate]
  );

  const generateShareUrl = useCallback(
    (dashboard: Dashboard, options: ShareOptions = {}): string => {
      const shareableUrl = routingService.createShareableUrl(
        dashboard,
        options
      );
      return shareableUrl.url;
    },
    []
  );

  const copyCurrentUrl = useCallback(async (): Promise<boolean> => {
    return routingService.copyDashboardUrl(currentParams);
  }, [currentParams]);

  // Bookmarks
  const bookmarkCurrent = useCallback(
    (title?: string): boolean => {
      if (!dashboardId) return false;

      try {
        // Create a mock dashboard object for bookmarking
        const mockDashboard: Dashboard = {
          id: dashboardId,
          name: title || `Dashboard ${dashboardId}`,
          description: '',
          isDefault: false,
          isPublic: false,
          ownerId: 'current-user',
          widgets: [],
          layout: {
            columns: 12,
            rows: 8,
            gap: 16,
            responsive: {
              mobile: {
                columns: 1,
                rows: 8,
                gap: 8,
                resizable: false,
                draggable: false,
              },
              tablet: {
                columns: 6,
                rows: 8,
                gap: 12,
                resizable: true,
                draggable: true,
              },
              desktop: {
                columns: 12,
                rows: 8,
                gap: 16,
                resizable: true,
                draggable: true,
              },
              ultrawide: {
                columns: 16,
                rows: 8,
                gap: 20,
                resizable: true,
                draggable: true,
              },
            },
            autoArrange: false,
            minWidgetSize: { width: 1, height: 1 },
            maxWidgetSize: { width: 12, height: 8 },
          },
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          sharing: {
            enabled: false,
            permissions: [],
            requireAuth: true,
          },
        };

        routingService.createBookmark(mockDashboard, title);
        return true;
      } catch (error) {
        console.error('Failed to create bookmark:', error);
        return false;
      }
    },
    [dashboardId]
  );

  const getBookmarks = useCallback(() => {
    return routingService.getBookmarks();
  }, []);

  // History
  const getNavigationHistory = useCallback(() => {
    return routingService.getNavigationHistory();
  }, []);

  const clearHistory = useCallback((): void => {
    routingService.clearNavigationHistory();
  }, []);

  return {
    // Current URL state
    currentParams,
    dashboardId,
    isEditMode,
    currentTab,
    currentWidget,

    // Navigation functions
    navigateToDashboard,
    navigateToEdit,
    navigateToView,
    goBack,
    goForward,

    // URL management
    updateUrl,
    generateShareUrl,
    copyCurrentUrl,

    // Bookmarks
    bookmarkCurrent,
    getBookmarks,

    // History
    getNavigationHistory,
    clearHistory,
  };
};

export default useDashboardRouting;
