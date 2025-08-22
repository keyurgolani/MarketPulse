/**
 * Register Form Component
 * Provides user registration interface with validation and accessibility
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUserStore } from '@/stores/userStore';
import type { RegisterPayload } from '@/types/user';

export interface RegisterFormProps {
  /** Callback when registration is successful */
  onSuccess?: () => void;
  /** Callback when user wants to login */
  onLoginClick?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onLoginClick,
}) => {
  const [formData, setFormData] = useState<RegisterPayload>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    acceptTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { setUser } = useUserStore();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        'Password must contain uppercase, lowercase, and number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms of service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      // For now, simulate registration with mock user
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockUser = {
        id: `user-${Date.now()}`,
        email: formData.email,
        displayName: formData.displayName || formData.email.split('@')[0],
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
      setErrors({
        submit: err instanceof Error ? err.message : 'Registration failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof RegisterPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const value =
        e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Account
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Join MarketPulse today
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md"
              role="alert"
              aria-live="polite"
            >
              <span className="font-medium">Error:</span> {errors.submit}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email Address *
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="Enter your email"
              required
              autoComplete="email"
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="w-full"
            />
            {errors.email && (
              <p
                id="email-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Display Name
            </label>
            <Input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleInputChange('displayName')}
              placeholder="Enter your display name (optional)"
              autoComplete="name"
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password *
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
              aria-describedby={
                errors.password ? 'password-error' : 'password-help'
              }
              className="w-full"
            />
            {errors.password ? (
              <p
                id="password-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {errors.password}
              </p>
            ) : (
              <p
                id="password-help"
                className="mt-1 text-sm text-gray-500 dark:text-gray-400"
              >
                Must be 8+ characters with uppercase, lowercase, and number
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm Password *
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
              aria-describedby={
                errors.confirmPassword ? 'confirm-password-error' : undefined
              }
              className="w-full"
            />
            {errors.confirmPassword && (
              <p
                id="confirm-password-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleInputChange('acceptTerms')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                aria-describedby={
                  errors.acceptTerms ? 'terms-error' : undefined
                }
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                I accept the{' '}
                <a
                  href="/terms"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/privacy"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </span>
            </label>
            {errors.acceptTerms && (
              <p
                id="terms-error"
                className="mt-1 text-sm text-red-600 dark:text-red-400"
              >
                {errors.acceptTerms}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        {onLoginClick && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={onLoginClick}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
