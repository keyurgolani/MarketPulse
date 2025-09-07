import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}): React.JSX.Element => {
  const baseClasses = [
    'rounded-lg transition-shadow duration-200',
    'bg-white dark:bg-gray-800',
  ];

  const variantClasses = {
    default: 'shadow-sm',
    outlined: 'border border-gray-200 dark:border-gray-700',
    elevated: 'shadow-lg hover:shadow-xl',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    className
  );

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  className,
  children,
  ...props
}): React.JSX.Element => {
  return (
    <div
      className={clsx(
        'border-b border-gray-200 dark:border-gray-700 pb-4 mb-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({
  as: Component = 'h3',
  className,
  children,
  ...props
}): React.JSX.Element => {
  return (
    <Component
      className={clsx(
        'text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  className,
  children,
  ...props
}): React.JSX.Element => {
  return (
    <div
      className={clsx('text-gray-600 dark:text-gray-300', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  className,
  children,
  ...props
}): React.JSX.Element => {
  return (
    <div
      className={clsx(
        'border-t border-gray-200 dark:border-gray-700 pt-4 mt-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
