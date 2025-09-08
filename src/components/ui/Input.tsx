import React from 'react';
import { clsx } from 'clsx';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, leftIcon, rightIcon, className, id, ...props },
    ref
  ): React.JSX.Element => {
    const inputId = id ?? `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperTextId = helperText ? `${inputId}-helper` : undefined;

    const inputClasses = clsx(
      'block w-full rounded-md border-0 py-1.5 shadow-sm ring-1 ring-inset',
      'placeholder:text-gray-400 focus:ring-2 focus:ring-inset',
      'sm:text-sm sm:leading-6 transition-colors duration-200',
      {
        'pl-10': leftIcon,
        'pr-10': rightIcon,
        'ring-gray-300 focus:ring-primary-600 dark:ring-gray-600 dark:focus:ring-primary-400':
          !error,
        'ring-danger-300 focus:ring-danger-600 dark:ring-danger-600 dark:focus:ring-danger-400':
          error,
        'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100':
          !props.disabled,
        'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400':
          props.disabled,
      },
      className
    );

    return (
      <div className='w-full'>
        {label && (
          <label
            htmlFor={inputId}
            className='block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100 mb-2'
          >
            {label}
          </label>
        )}
        <div className='relative'>
          {leftIcon && (
            <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
              <div className='h-5 w-5 text-gray-400' aria-hidden='true'>
                {leftIcon}
              </div>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={clsx(errorId, helperTextId).trim() || undefined}
            {...props}
          />
          {rightIcon && (
            <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3'>
              <div className='h-5 w-5 text-gray-400' aria-hidden='true'>
                {rightIcon}
              </div>
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className='mt-2 text-sm text-danger-600 dark:text-danger-400'
            role='alert'
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={helperTextId}
            className='mt-2 text-sm text-gray-500 dark:text-gray-400'
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
