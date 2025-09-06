import React from 'react';
import { clsx } from 'clsx';

export interface FooterProps {
  className?: string;
  children?: React.ReactNode;
}

export const Footer: React.FC<FooterProps> = ({
  className,
  children,
}): React.JSX.Element => {
  return (
    <footer
      className={clsx(
        'bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </footer>
  );
};

export interface FooterSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const FooterSection: React.FC<FooterSectionProps> = ({
  title,
  children,
  className,
}): React.JSX.Element => {
  return (
    <div className={clsx('space-y-4', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
};

export interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  className?: string;
}

export const FooterLink: React.FC<FooterLinkProps> = ({
  href,
  children,
  external = false,
  className,
}): React.JSX.Element => {
  return (
    <a
      href={href}
      className={clsx(
        'text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
        'transition-colors duration-200 block',
        className
      )}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      {children}
      {external && (
        <svg
          className="inline-block ml-1 h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      )}
    </a>
  );
};

export interface FooterCopyrightProps {
  year?: number;
  company: string;
  className?: string;
}

export const FooterCopyright: React.FC<FooterCopyrightProps> = ({
  year = new Date().getFullYear(),
  company,
  className,
}): React.JSX.Element => {
  return (
    <div
      className={clsx(
        'border-t border-gray-200 dark:border-gray-700 pt-6 mt-8',
        className
      )}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        © {year} {company}. All rights reserved.
      </p>
    </div>
  );
};

export interface FooterSocialLinksProps {
  links: SocialLink[];
  className?: string;
}

export interface SocialLink {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export const FooterSocialLinks: React.FC<FooterSocialLinksProps> = ({
  links,
  className,
}): React.JSX.Element => {
  return (
    <div className={clsx('flex space-x-4', className)}>
      {links.map((link) => (
        <a
          key={link.name}
          href={link.href}
          className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors duration-200"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow us on ${link.name}`}
        >
          <div className="h-5 w-5">
            {link.icon}
          </div>
        </a>
      ))}
    </div>
  );
};