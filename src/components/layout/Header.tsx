import React from 'react';
import { clsx } from 'clsx';

export interface HeaderProps {
  className?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  className,
  children,
}): React.JSX.Element => {
  return (
    <header
      className={clsx(
        'bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {children}
        </div>
      </div>
    </header>
  );
};

export interface HeaderBrandProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export const HeaderBrand: React.FC<HeaderBrandProps> = ({
  href = '/',
  children,
  className,
}): React.JSX.Element => {
  const Component = href ? 'a' : 'div';
  const componentProps = href ? { href } : {};
  
  return (
    <Component
      {...componentProps}
      className={clsx(
        'flex items-center space-x-2 text-xl font-bold text-gray-900 dark:text-gray-100',
        href && 'hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200',
        className
      )}
    >
      {children}
    </Component>
  );
};

export interface HeaderNavProps {
  children: React.ReactNode;
  className?: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  children,
  className,
}): React.JSX.Element => {
  return (
    <nav
      className={clsx('hidden md:flex items-center space-x-4', className)}
      aria-label="Main navigation"
    >
      {children}
    </nav>
  );
};

export interface HeaderActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const HeaderActions: React.FC<HeaderActionsProps> = ({
  children,
  className,
}): React.JSX.Element => {
  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      {children}
    </div>
  );
};

export interface HeaderMobileMenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const HeaderMobileMenuButton: React.FC<HeaderMobileMenuButtonProps> = ({
  isOpen,
  onClick,
  className,
}): React.JSX.Element => {
  return (
    <button
      type="button"
      className={clsx(
        'md:hidden inline-flex items-center justify-center p-2 rounded-md',
        'text-gray-400 hover:text-gray-500 hover:bg-gray-100',
        'dark:text-gray-500 dark:hover:text-gray-400 dark:hover:bg-gray-700',
        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500',
        className
      )}
      aria-expanded={isOpen}
      aria-label={isOpen ? 'Close main menu' : 'Open main menu'}
      onClick={onClick}
    >
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        {isOpen ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        )}
      </svg>
    </button>
  );
};