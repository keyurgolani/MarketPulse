/**
 * Login Form Component
 * Provides user authentication interface with accessibility features
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUserStore } from '@/stores/userStore';
import type { AuthPayload } from '@/types/user';

export interface LoginFormProps {
  /** Callback when login is successful */
  onSuccess?: () => void;
  /** Callback when user wants to register */
  onRegisterClick?: () => void;
  /** Callback when user wants to reset password */
  onForgotPasswordClick?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onRegisterClick,
  onForgotPasswordClick,
}) => {
  const [formData, setFormData] = useState<AuthPayload>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setUser } = useUserStore();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // For now, simulate login with mock user
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockUser = {
        id: 'user-1',
        email: formData.email,
        displayName: formData.email.split('@')[0],
        preferences: {
          theme: 'system' as const,
          refreshInterval: 60000,
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
            fontSize: 'medium' as const,
            keyboardNavigation: true,
            enhancedFocus: false,
          },
          display: {
            numberFormat: {
              locale: 'en-US',
              thousandsSeparator: ',' as const,
              decimalSeparator: '.' as const,
            },
            dateFormat: 'MM/DD/YYYY' as const,
            timezone: 'America/New_York',
            currency: 'USD',
            priceDecimalPlaces: 2,
            showPercentageChanges: true,
            compactNumbers: false,
          },
          trading: {
            defaultTimeframe: '1D',
            defaultIndicators: ['sma', 'volume'],
            chartType: 'line' as const,
            showExtendedHours: false,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        role: 'user' as const,
      };

      setUser(mockUser);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof AuthPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value =
        e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));
    };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sign In
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Welcome back to MarketPulse
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md"
              role="alert"
              aria-live="polite"
            >
              <span className="font-medium">Error:</span> {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="Enter your email"
              required
              autoComplete="email"
              aria-describedby="email-error"
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              aria-describedby="password-error"
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleInputChange('rememberMe')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Remember me
              </span>
            </label>

            {onForgotPasswordClick && (
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                Forgot password?
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {onRegisterClick && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <button
                onClick={onRegisterClick}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
