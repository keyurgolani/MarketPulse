/**
 * User Store
 * Manages user data, preferences, and authentication state
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { User, UserPreferences } from '@/types/user';

export interface UserState {
  // User data
  user: User | null;
  isAuthenticated: boolean;

  // Preferences
  preferences: UserPreferences;

  // Actions
  setUser: (user: User | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  logout: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  defaultDashboard: undefined,
  refreshInterval: 60000, // 1 minute
  notifications: {
    priceAlerts: true,
    newsUpdates: true,
    systemMessages: true,
    emailNotifications: false,
    pushNotifications: true,
    priceAlertThresholds: {
      percentageThreshold: 5,
      priceThreshold: 1,
      volumeThreshold: 50,
      maxAlertsPerHour: 10,
    },
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    screenReaderOptimized: false,
    fontSize: 'medium',
    keyboardNavigation: true,
    enhancedFocus: false,
  },
  display: {
    numberFormat: {
      locale: 'en-US',
      thousandsSeparator: ',',
      decimalSeparator: '.',
    },
    dateFormat: 'MM/DD/YYYY',
    timezone: 'America/New_York',
    currency: 'USD',
    priceDecimalPlaces: 2,
    showPercentageChanges: true,
    compactNumbers: false,
  },
  trading: {
    defaultTimeframe: '1D',
    defaultIndicators: ['sma', 'volume'],
    chartType: 'line',
    showExtendedHours: false,
    defaultWatchlist: undefined,
  },
};

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        preferences: defaultPreferences,

        // Actions
        setUser: (user: User | null): void => {
          set({
            user,
            isAuthenticated: user !== null,
          });
        },

        updatePreferences: (newPreferences: Partial<UserPreferences>): void => {
          const { preferences } = get();
          set({
            preferences: {
              ...preferences,
              ...newPreferences,
              // Deep merge nested objects
              notifications: {
                ...preferences.notifications,
                ...(newPreferences.notifications || {}),
                priceAlertThresholds: {
                  ...preferences.notifications.priceAlertThresholds,
                  ...(newPreferences.notifications?.priceAlertThresholds || {}),
                },
              },
              display: {
                ...preferences.display,
                ...(newPreferences.display || {}),
                numberFormat: {
                  ...preferences.display.numberFormat,
                  ...(newPreferences.display?.numberFormat || {}),
                },
              },
              accessibility: {
                ...preferences.accessibility,
                ...(newPreferences.accessibility || {}),
              },
              trading: {
                ...preferences.trading,
                ...(newPreferences.trading || {}),
              },
            },
          });
        },

        resetPreferences: (): void => {
          set({ preferences: defaultPreferences });
        },

        logout: (): void => {
          set({
            user: null,
            isAuthenticated: false,
            preferences: defaultPreferences,
          });
        },
      }),
      {
        name: 'user-storage',
        partialize: state => ({
          preferences: state.preferences,
          // Don't persist user data for security
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);

// Utility hooks
export const useUser = (): User | null => {
  return useUserStore(state => state.user);
};

export const useIsAuthenticated = (): boolean => {
  return useUserStore(state => state.isAuthenticated);
};

export const useUserPreferences = (): UserPreferences => {
  return useUserStore(state => state.preferences);
};

export const useNotificationPreferences =
  (): UserPreferences['notifications'] => {
    return useUserStore(state => state.preferences.notifications);
  };

export const useDisplayPreferences = (): UserPreferences['display'] => {
  return useUserStore(state => state.preferences.display);
};

export const useAccessibilityPreferences =
  (): UserPreferences['accessibility'] => {
    return useUserStore(state => state.preferences.accessibility);
  };
