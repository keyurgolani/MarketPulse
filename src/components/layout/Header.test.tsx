import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Header,
  HeaderBrand,
  HeaderNav,
  HeaderActions,
  HeaderMobileMenuButton,
} from './Header';

describe('Header', () => {
  it('renders with default styling', () => {
    render(<Header>Header content</Header>);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('bg-white', 'shadow-sm', 'border-b');
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Header className='custom-header'>Content</Header>);

    expect(screen.getByRole('banner')).toHaveClass('custom-header');
  });

  it('includes skip to main content link', () => {
    render(<Header>Content</Header>);

    const skipLink = screen.getByRole('link', {
      name: /skip to main content/i,
    });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(skipLink).toHaveClass('sr-only');
  });

  it('has proper responsive container', () => {
    render(<Header>Content</Header>);

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4');
  });
});

describe('HeaderBrand', () => {
  it('renders as link when href is provided', () => {
    render(<HeaderBrand href='/home'>Brand Name</HeaderBrand>);

    const brand = screen.getByRole('link');
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveAttribute('href', '/home');
    expect(brand).toHaveTextContent('Brand Name');
  });

  it('renders as div when href is null', () => {
    // @ts-expect-error - Testing edge case
    render(<HeaderBrand href={null}>Brand Name</HeaderBrand>);

    expect(screen.getByText('Brand Name')).toBeInTheDocument();
    // Since href has a default value, we need to test the component logic differently
    const element = screen.getByText('Brand Name');
    expect(element.tagName).toBe('DIV');
  });

  it('has proper styling', () => {
    render(<HeaderBrand>Brand</HeaderBrand>);

    const brand = screen.getByText('Brand');
    expect(brand).toHaveClass(
      'flex',
      'items-center',
      'space-x-2',
      'text-xl',
      'font-bold'
    );
  });

  it('applies custom className', () => {
    render(<HeaderBrand className='custom-brand'>Brand</HeaderBrand>);

    expect(screen.getByText('Brand')).toHaveClass('custom-brand');
  });

  it('has hover styles when href is provided', () => {
    render(<HeaderBrand href='/'>Brand</HeaderBrand>);

    const brand = screen.getByRole('link');
    expect(brand).toHaveClass('hover:text-primary-600', 'transition-colors');
  });
});

describe('HeaderNav', () => {
  it('renders navigation with proper attributes', () => {
    render(
      <HeaderNav>
        <a href='/home'>Home</a>
        <a href='/about'>About</a>
      </HeaderNav>
    );

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('hidden', 'md:flex', 'items-center', 'space-x-4');
  });

  it('renders navigation items', () => {
    render(
      <HeaderNav>
        <a href='/home'>Home</a>
        <a href='/about'>About</a>
      </HeaderNav>
    );

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<HeaderNav className='custom-nav'>Content</HeaderNav>);

    expect(screen.getByRole('navigation')).toHaveClass('custom-nav');
  });
});

describe('HeaderActions', () => {
  it('renders actions container', () => {
    render(
      <HeaderActions>
        <button>Action 1</button>
        <button>Action 2</button>
      </HeaderActions>
    );

    const container = screen.getByRole('button', {
      name: /action 1/i,
    }).parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'space-x-2');
  });

  it('renders action items', () => {
    render(
      <HeaderActions>
        <button>Login</button>
        <button>Sign Up</button>
      </HeaderActions>
    );

    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign up/i })
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <HeaderActions className='custom-actions'>
        <span>Content</span>
      </HeaderActions>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('custom-actions');
  });
});

describe('HeaderMobileMenuButton', () => {
  it('renders mobile menu button', () => {
    const handleClick = vi.fn();
    render(<HeaderMobileMenuButton isOpen={false} onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /open main menu/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('md:hidden', 'inline-flex');
  });

  it('shows correct icon when closed', () => {
    const handleClick = vi.fn();
    render(<HeaderMobileMenuButton isOpen={false} onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    // Check for hamburger menu icon (three lines)
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows correct icon when open', () => {
    const handleClick = vi.fn();
    render(<HeaderMobileMenuButton isOpen={true} onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /close main menu/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    // Check for close icon (X)
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<HeaderMobileMenuButton isOpen={false} onClick={handleClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    const handleClick = vi.fn();
    render(<HeaderMobileMenuButton isOpen={false} onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-label', 'Open main menu');
  });

  it('applies custom className', () => {
    const handleClick = vi.fn();
    render(
      <HeaderMobileMenuButton
        isOpen={false}
        onClick={handleClick}
        className='custom-button'
      />
    );

    expect(screen.getByRole('button')).toHaveClass('custom-button');
  });

  it('has proper focus styles', () => {
    const handleClick = vi.fn();
    render(<HeaderMobileMenuButton isOpen={false} onClick={handleClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-inset'
    );
  });
});
