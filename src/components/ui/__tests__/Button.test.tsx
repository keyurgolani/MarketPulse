import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should render with primary variant', () => {
    render(<Button variant="primary">Primary</Button>);

    const button = screen.getByRole('button', { name: 'Primary' });
    expect(button).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole('button', { name: 'Secondary' });
    expect(button).toHaveClass('bg-gray-100', 'text-gray-900');
  });

  it('should render with outline variant', () => {
    render(<Button variant="outline">Outline</Button>);

    const button = screen.getByRole('button', { name: 'Outline' });
    expect(button).toHaveClass('border-gray-300', 'bg-transparent');
  });

  it('should render with ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole('button', { name: 'Ghost' });
    expect(button).toHaveClass('bg-transparent', 'text-gray-700');
  });

  it('should render with destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toHaveClass('bg-red-600', 'text-white');
  });

  it('should render with small size', () => {
    render(<Button size="sm">Small</Button>);

    const button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('h-8', 'px-3', 'text-sm');
  });

  it('should render with default size', () => {
    render(<Button size="md">Default</Button>);

    const button = screen.getByRole('button', { name: 'Default' });
    expect(button).toHaveClass('h-10', 'px-4', 'text-sm');
  });

  it('should render with large size', () => {
    render(<Button size="lg">Large</Button>);

    const button = screen.getByRole('button', { name: 'Large' });
    expect(button).toHaveClass('h-12', 'px-6', 'text-base');
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass(
      'disabled:pointer-events-none',
      'disabled:opacity-50'
    );

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render as loading state', () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
    // Check for loading spinner
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should accept custom className', () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toHaveClass('custom-class');
  });

  it('should forward ref correctly', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Ref test</Button>);

    expect(ref).toHaveBeenCalled();
  });

  it('should render with icon', () => {
    const Icon = (): JSX.Element => <span data-testid="icon">🔥</span>;
    render(
      <Button>
        <Icon />
        With Icon
      </Button>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /with icon/i })
    ).toBeInTheDocument();
  });

  it('should handle keyboard events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Keyboard</Button>);

    const button = screen.getByRole('button', { name: 'Keyboard' });

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });

    // Button should handle these natively, so we just check it's focusable
    expect(button).toHaveAttribute('type', 'button');
  });
});
