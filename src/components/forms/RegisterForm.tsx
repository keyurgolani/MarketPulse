import React from 'react';
import { Button, Input } from '@/components/ui';
import { useRegisterForm } from '@/hooks/useAuthForm';

export interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  className?: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
  className = '',
}): React.JSX.Element => {
  const {
    formData,
    updateField,
    submitForm,
    isSubmitting,
    errors,
  } = useRegisterForm();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    const success = await submitForm();
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Account
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Join MarketPulse to start tracking your investments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General Error */}
          {errors.general && (
            <div 
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md"
              role="alert"
              aria-live="polite"
            >
              {errors.general}
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label 
                htmlFor="register-first-name" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                First Name
              </label>
              <Input
                id="register-first-name"
                type="text"
                value={formData.first_name}
                onChange={(e) => updateField('first_name', e.target.value)}
                placeholder="First name"
                error={errors.first_name}
                disabled={isSubmitting}
                autoComplete="given-name"
                required
                aria-describedby={errors.first_name ? 'first-name-error' : undefined}
              />
              {errors.first_name && (
                <p id="first-name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.first_name}
                </p>
              )}
            </div>

            <div>
              <label 
                htmlFor="register-last-name" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Last Name
              </label>
              <Input
                id="register-last-name"
                type="text"
                value={formData.last_name}
                onChange={(e) => updateField('last_name', e.target.value)}
                placeholder="Last name"
                error={errors.last_name}
                disabled={isSubmitting}
                autoComplete="family-name"
                required
                aria-describedby={errors.last_name ? 'last-name-error' : undefined}
              />
              {errors.last_name && (
                <p id="last-name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.last_name}
                </p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label 
              htmlFor="register-email" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email Address
            </label>
            <Input
              id="register-email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Enter your email"
              error={errors.email}
              disabled={isSubmitting}
              autoComplete="email"
              required
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label 
              htmlFor="register-password" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <Input
              id="register-password"
              type="password"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Create a password"
              error={errors.password}
              disabled={isSubmitting}
              autoComplete="new-password"
              required
              aria-describedby={errors.password ? 'password-error' : 'password-help'}
            />
            {errors.password ? (
              <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.password}
              </p>
            ) : (
              <p id="password-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Must be at least 8 characters with uppercase, lowercase, and number.
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label 
              htmlFor="register-confirm-password" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm Password
            </label>
            <Input
              id="register-confirm-password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              placeholder="Confirm your password"
              error={errors.confirmPassword}
              disabled={isSubmitting}
              autoComplete="new-password"
              required
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            loading={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        {/* Switch to Login */}
        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium focus:outline-none focus:underline"
                disabled={isSubmitting}
              >
                Sign in here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};