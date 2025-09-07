import React from 'react';
import { Button, Input } from '@/components/ui';
import { useLoginForm } from '@/hooks/useAuthForm';

export interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  className?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
  className = '',
}): React.JSX.Element => {
  const { formData, updateField, submitForm, isSubmitting, errors } =
    useLoginForm();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const success = await submitForm();
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className='bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6'>
        <div className='text-center mb-6'>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Sign In
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mt-2'>
            Welcome back! Please sign in to your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* General Error */}
          {errors.general && (
            <div
              className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md'
              role='alert'
              aria-live='polite'
            >
              {errors.general}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label
              htmlFor='login-email'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Email Address
            </label>
            <Input
              id='login-email'
              name='email'
              type='email'
              value={formData.email}
              onChange={updateField}
              placeholder='Enter your email'
              error={errors.email}
              disabled={isSubmitting}
              autoComplete='email'
              required
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p
                id='email-error'
                className='mt-1 text-sm text-red-600 dark:text-red-400'
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor='login-password'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Password
            </label>
            <Input
              id='login-password'
              name='password'
              type='password'
              value={formData.password}
              onChange={updateField}
              placeholder='Enter your password'
              error={errors.password}
              disabled={isSubmitting}
              autoComplete='current-password'
              required
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <p
                id='password-error'
                className='mt-1 text-sm text-red-600 dark:text-red-400'
              >
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type='submit'
            variant='primary'
            size='lg'
            disabled={isSubmitting}
            loading={isSubmitting}
            className='w-full'
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        {/* Switch to Register */}
        {onSwitchToRegister && (
          <div className='mt-6 text-center'>
            <p className='text-gray-600 dark:text-gray-400'>
              Don&apos;t have an account?{' '}
              <button
                type='button'
                onClick={onSwitchToRegister}
                className='text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium focus:outline-none focus:underline'
                disabled={isSubmitting}
              >
                Sign up here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
