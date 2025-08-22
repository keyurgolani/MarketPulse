/**
 * User Profile Component
 * Provides user profile management and settings interface
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useUserStore, useUser, useUserPreferences } from '@/stores/userStore';
import type { ProfileUpdatePayload, UserPreferences } from '@/types/user';

export interface UserProfileProps {
  /** Callback when profile is updated */
  onUpdate?: () => void;
  /** Callback when user logs out */
  onLogout?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  onUpdate,
  onLogout,
}) => {
  const user = useUser();
  const preferences = useUserPreferences();
  const { updatePreferences, logout } = useUserStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileUpdatePayload>({
    displayName: user?.displayName || '',
  });

  const handleProfileUpdate = async (): Promise<void> => {
    if (!user) return;

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update local state (in real app, this would come from API response)
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): void => {
    updatePreferences({ [key]: value });
  };

  const handleLogout = (): void => {
    logout();
    onLogout?.();
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          Please sign in to view your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Profile Settings
          </h1>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Sign Out
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <span className="text-xl font-semibold text-blue-600 dark:text-blue-400">
              {(user.displayName || user.email)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={profileData.displayName}
                  onChange={e =>
                    setProfileData(prev => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder="Display name"
                  className="max-w-xs"
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleProfileUpdate}
                    disabled={isLoading}
                    size="sm"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user.displayName || 'User'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                >
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Theme
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose your preferred theme
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Price Alerts
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get notified when prices change significantly
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notifications.priceAlerts}
                onChange={e =>
                  handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    priceAlerts: e.target.checked,
                  })
                }
                className="sr-only peer"
                aria-label="Enable price alerts"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                News Updates
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive notifications for market news
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notifications.newsUpdates}
                onChange={e =>
                  handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    newsUpdates: e.target.checked,
                  })
                }
                className="sr-only peer"
                aria-label="Enable news updates"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Notifications
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Send notifications to your email
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notifications.emailNotifications}
                onChange={e =>
                  handlePreferenceChange('notifications', {
                    ...preferences.notifications,
                    emailNotifications: e.target.checked,
                  })
                }
                className="sr-only peer"
                aria-label="Enable email notifications"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Display Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="currency-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Currency
            </label>
            <select
              id="currency-select"
              value={preferences.display.currency}
              onChange={e =>
                handlePreferenceChange('display', {
                  ...preferences.display,
                  currency: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="date-format-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Date Format
            </label>
            <select
              id="date-format-select"
              value={preferences.display.dateFormat}
              onChange={e =>
                handlePreferenceChange('display', {
                  ...preferences.display,
                  dateFormat: e.target.value as
                    | 'MM/DD/YYYY'
                    | 'DD/MM/YYYY'
                    | 'YYYY-MM-DD'
                    | 'relative',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="relative">Relative (2 days ago)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accessibility Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Accessibility
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                High Contrast
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Increase contrast for better visibility
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.accessibility.highContrast}
                onChange={e =>
                  handlePreferenceChange('accessibility', {
                    ...preferences.accessibility,
                    highContrast: e.target.checked,
                  })
                }
                className="sr-only peer"
                aria-label="Enable high contrast mode"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reduced Motion
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Minimize animations and transitions
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.accessibility.reducedMotion}
                onChange={e =>
                  handlePreferenceChange('accessibility', {
                    ...preferences.accessibility,
                    reducedMotion: e.target.checked,
                  })
                }
                className="sr-only peer"
                aria-label="Enable reduced motion"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label
              htmlFor="font-size-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Font Size
            </label>
            <select
              id="font-size-select"
              value={preferences.accessibility.fontSize}
              onChange={e =>
                handlePreferenceChange('accessibility', {
                  ...preferences.accessibility,
                  fontSize: e.target.value as
                    | 'small'
                    | 'medium'
                    | 'large'
                    | 'extra-large',
                })
              }
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
