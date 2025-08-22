/**
 * Password Reset Form Component
 * Provides password reset interface with email validation
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { PasswordResetPayload } from '@/types/user';

export interface PasswordResetFormProps {
  /** Callback when reset is successful */
  onSuccess?: () => void;
  /** Callback when user wants to login */
  onLoginClick?: () => void;
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSuccess,
  onLoginClick,
}) => {
  const [formData, setFormData] = useState<PasswordResetPayload>({
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // For now, simulate password reset
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsSuccess(true);

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        onSuccess?.();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({ email: e.target.value });
    if (error) {
      setError(null);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Check Your Email
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We&apos;ve sent a password reset link to{' '}
              <span className="font-medium">{formData.email}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Didn&apos;t receive the email? Check your spam folder or try
              again.
            </p>
            {onLoginClick && (
              <Button
                onClick={onLoginClick}
                variant="outline"
                className="w-full"
              >
                Back to Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reset Password
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter your email to receive a reset link
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
              htmlFor="reset-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email Address
            </label>
            <Input
              id="reset-email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email address"
              required
              autoComplete="email"
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !formData.email}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </Button>
        </form>

        {onLoginClick && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
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
