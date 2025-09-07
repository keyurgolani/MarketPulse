import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Navigation,
  NavigationItem,
  MobileNavigation,
  Breadcrumb,
} from './Navigation';

describe('Navigation', () => {
  it('renders with horizontal orientation by default', () => {
    render(
      <Navigation>
        <div>Item 1</div>
        <div>Item 2</div>
      </Navigation>
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('flex', 'items-center', 'space-x-4');
  });

  it('renders with vertical orientation', () => {
    render(
      <Navigation orientation='vertical'>
        <div>Item 1</div>
        <div>Item 2</div>
      </Navigation>
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('flex', 'flex-col', 'space-y-2');
  });

  it('applies custom className', () => {
    render(<Navigation className='custom-nav'>Content</Navigation>);

    expect(screen.getByRole('navigation')).toHaveClass('custom-nav');
  });
});

describe('NavigationItem', () => {
  it('renders as link when href is provided', () => {
    render(<NavigationItem href='/home'>Home</NavigationItem>);

    const link = screen.getByRole('link', { name: /home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/home');
  });

  it('renders as button when no href is provided', () => {
    render(<NavigationItem>Button Item</NavigationItem>);

    const button = screen.getByRole('button', { name: /button item/i });
    expect(button).toBeInTheDocument();
  });

  it('shows active state correctly', () => {
    render(
      <NavigationItem href='/home' isActive>
        Home
      </NavigationItem>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveClass('bg-primary-100', 'text-primary-700');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('shows inactive state correctly', () => {
    render(<NavigationItem href='/home'>Home</NavigationItem>);

    const link = screen.getByRole('link');
    expect(link).toHaveClass('text-gray-600', 'hover:text-gray-900');
    expect(link).not.toHaveAttribute('aria-current');
  });

  it('shows disabled state correctly', () => {
    render(<NavigationItem disabled>Disabled</NavigationItem>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('text-gray-400', 'cursor-not-allowed');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<NavigationItem onClick={handleClick}>Clickable</NavigationItem>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick for links', () => {
    const handleClick = vi.fn();
    render(
      <NavigationItem href='/home' onClick={handleClick}>
        Home
      </NavigationItem>
    );

    const link = screen.getByRole('link');
    fireEvent.click(link);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <NavigationItem onClick={handleClick} disabled>
        Disabled
      </NavigationItem>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<NavigationItem className='custom-item'>Item</NavigationItem>);

    expect(screen.getByRole('button')).toHaveClass('custom-item');
  });

  it('has proper focus styles', () => {
    render(<NavigationItem>Item</NavigationItem>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-primary-500'
    );
  });
});

describe('MobileNavigation', () => {
  it('renders when open', () => {
    render(
      <MobileNavigation isOpen={true}>
        <div>Mobile Item</div>
      </MobileNavigation>
    );

    expect(screen.getByText('Mobile Item')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <MobileNavigation isOpen={false}>
        <div>Mobile Item</div>
      </MobileNavigation>
    );

    expect(screen.queryByText('Mobile Item')).not.toBeInTheDocument();
  });

  it('has proper mobile styling', () => {
    render(
      <MobileNavigation isOpen={true}>
        <div>Mobile Item</div>
      </MobileNavigation>
    );

    const container =
      screen.getByText('Mobile Item').parentElement?.parentElement;
    expect(container).toHaveClass('md:hidden', 'border-t', 'bg-white');
  });

  it('applies custom className', () => {
    render(
      <MobileNavigation isOpen={true} className='custom-mobile'>
        <div>Content</div>
      </MobileNavigation>
    );

    const container = screen.getByText('Content').parentElement?.parentElement;
    expect(container).toHaveClass('custom-mobile');
  });
});

describe('Breadcrumb', () => {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Current Page', isActive: true },
  ];

  it('renders breadcrumb navigation', () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders all breadcrumb items', () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('renders links for non-active items with href', () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('href', '/');

    const productsLink = screen.getByRole('link', { name: /products/i });
    expect(productsLink).toHaveAttribute('href', '/products');
  });

  it('renders active item as span with aria-current', () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    const activeItem = screen.getByText('Current Page');
    expect(activeItem.tagName).toBe('SPAN');
    expect(activeItem).toHaveAttribute('aria-current', 'page');
  });

  it('renders separators between items', () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    const separators = document.querySelectorAll('svg[aria-hidden="true"]');
    expect(separators).toHaveLength(2); // One less than the number of items
  });

  it('handles items without href', () => {
    const items = [{ label: 'Home', href: '/' }, { label: 'No Link' }];

    render(<Breadcrumb items={items} />);

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByText('No Link')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /no link/i })
    ).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Breadcrumb items={breadcrumbItems} className='custom-breadcrumb' />
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-breadcrumb');
  });

  it('has proper styling for links and text', () => {
    render(<Breadcrumb items={breadcrumbItems} />);

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveClass('text-sm', 'font-medium', 'text-gray-500');

    const activeItem = screen.getByText('Current Page');
    expect(activeItem).toHaveClass('text-sm', 'font-medium', 'text-gray-900');
  });

  it('handles empty items array', () => {
    render(<Breadcrumb items={[]} />);

    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(nav.querySelector('ol')).toBeEmptyDOMElement();
  });
});
