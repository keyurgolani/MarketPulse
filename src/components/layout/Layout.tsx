import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Header, HeaderBrand, HeaderNav, HeaderActions, HeaderMobileMenuButton } from './Header';
import { Navigation, NavigationItem, MobileNavigation } from './Navigation';
import { Footer, FooterSection, FooterLink, FooterCopyright } from './Footer';
import { ErrorBoundary } from '../ui/ErrorBoundary';

export interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  className,
}): React.JSX.Element => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = (): void => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = (): void => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={clsx('min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900', className)}>
      <ErrorBoundary>
        <Header>
          <HeaderBrand href="/">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span>MarketPulse</span>
          </HeaderBrand>

          <HeaderNav>
            <Navigation>
              <NavigationItem href="/" isActive>
                Dashboard
              </NavigationItem>
              <NavigationItem href="/markets">
                Markets
              </NavigationItem>
              <NavigationItem href="/news">
                News
              </NavigationItem>
              <NavigationItem href="/watchlist">
                Watchlist
              </NavigationItem>
            </Navigation>
          </HeaderNav>

          <HeaderActions>
            {/* Theme toggle and user menu will be added in later tasks */}
            <HeaderMobileMenuButton
              isOpen={isMobileMenuOpen}
              onClick={toggleMobileMenu}
            />
          </HeaderActions>
        </Header>

        <MobileNavigation isOpen={isMobileMenuOpen}>
          <NavigationItem href="/" isActive onClick={closeMobileMenu}>
            Dashboard
          </NavigationItem>
          <NavigationItem href="/markets" onClick={closeMobileMenu}>
            Markets
          </NavigationItem>
          <NavigationItem href="/news" onClick={closeMobileMenu}>
            News
          </NavigationItem>
          <NavigationItem href="/watchlist" onClick={closeMobileMenu}>
            Watchlist
          </NavigationItem>
        </MobileNavigation>

        <main
          id="main-content"
          className="flex-1 focus:outline-none"
          tabIndex={-1}
        >
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        <Footer>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <FooterSection title="Product">
              <FooterLink href="/features">Features</FooterLink>
              <FooterLink href="/pricing">Pricing</FooterLink>
              <FooterLink href="/api">API</FooterLink>
              <FooterLink href="/integrations">Integrations</FooterLink>
            </FooterSection>

            <FooterSection title="Company">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
              <FooterLink href="/careers">Careers</FooterLink>
              <FooterLink href="/contact">Contact</FooterLink>
            </FooterSection>

            <FooterSection title="Resources">
              <FooterLink href="/docs">Documentation</FooterLink>
              <FooterLink href="/help">Help Center</FooterLink>
              <FooterLink href="/status">Status</FooterLink>
              <FooterLink href="/changelog">Changelog</FooterLink>
            </FooterSection>

            <FooterSection title="Legal">
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/security">Security</FooterLink>
              <FooterLink href="/compliance">Compliance</FooterLink>
            </FooterSection>
          </div>

          <FooterCopyright company="MarketPulse" />
        </Footer>
      </ErrorBoundary>
    </div>
  );
};