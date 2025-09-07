import React from 'react';
import { clsx } from 'clsx';

export interface NavigationProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export const Navigation: React.FC<NavigationProps> = ({
  children,
  className,
  orientation = 'horizontal',
}): React.JSX.Element => {
  const orientationClasses = {
    horizontal: 'flex items-center space-x-4',
    vertical: 'flex flex-col space-y-2',
  };

  return (
    <nav
      className={clsx(orientationClasses[orientation], className)}
      role='navigation'
    >
      {children}
    </nav>
  );
};

export interface NavigationItemProps {
  href?: string;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const NavigationItem: React.FC<NavigationItemProps> = ({
  href,
  isActive = false,
  disabled = false,
  children,
  className,
  onClick,
}): React.JSX.Element => {
  const baseClasses = [
    'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  ];

  const stateClasses = {
    active:
      'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
    inactive:
      'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700',
    disabled: 'text-gray-400 cursor-not-allowed dark:text-gray-600',
  };

  const getStateClass = (): string => {
    if (disabled) return stateClasses.disabled;
    if (isActive) return stateClasses.active;
    return stateClasses.inactive;
  };

  const classes = clsx(baseClasses, getStateClass(), className);

  if (href && !disabled) {
    return (
      <a
        href={href}
        className={classes}
        aria-current={isActive ? 'page' : undefined}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type='button'
      className={classes}
      disabled={disabled}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export interface MobileNavigationProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  children,
  className,
}): React.JSX.Element => {
  if (!isOpen) return <></>;

  return (
    <div
      className={clsx(
        'md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
        className
      )}
    >
      <div className='px-2 pt-2 pb-3 space-y-1'>{children}</div>
    </div>
  );
};

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className,
}): React.JSX.Element => {
  return (
    <nav className={clsx('flex', className)} aria-label='Breadcrumb'>
      <ol className='flex items-center space-x-2'>
        {items.map((item, index) => (
          <li key={index} className='flex items-center'>
            {index > 0 && (
              <svg
                className='flex-shrink-0 h-4 w-4 text-gray-400 mx-2'
                fill='currentColor'
                viewBox='0 0 20 20'
                aria-hidden='true'
              >
                <path
                  fillRule='evenodd'
                  d='M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z'
                  clipRule='evenodd'
                />
              </svg>
            )}

            {item.href && !item.isActive ? (
              <a
                href={item.href}
                className='text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                {item.label}
              </a>
            ) : (
              <span
                className={clsx(
                  'text-sm font-medium',
                  item.isActive
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400'
                )}
                aria-current={item.isActive ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
