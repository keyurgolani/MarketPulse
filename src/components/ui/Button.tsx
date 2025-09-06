import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}): React.JSX.Element => {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-md',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'transition-colors duration-200',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ];

  const variantClasses = {
    primary: [
      'bg-primary-600 text-white hover:bg-primary-700',
      'focus:ring-primary-500 dark:focus:ring-primary-400',
    ],
    secondary: [
      'bg-gray-600 text-white hover:bg-gray-700',
      'focus:ring-gray-500 dark:focus:ring-gray-400',
    ],
    outline: [
      'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
      'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
      'focus:ring-primary-500 dark:focus:ring-primary-400',
    ],
    ghost: [
      'text-gray-700 hover:bg-gray-100',
      'dark:text-gray-300 dark:hover:bg-gray-800',
      'focus:ring-primary-500 dark:focus:ring-primary-400',
    ],
    danger: [
      'bg-danger-600 text-white hover:bg-danger-700',
      'focus:ring-danger-500 dark:focus:ring-danger-400',
    ],
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled ?? loading}
      aria-disabled={disabled ?? loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};