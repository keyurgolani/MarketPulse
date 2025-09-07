import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-600', 'text-white');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant='secondary'>Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600');

    rerender(<Button variant='outline'>Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border', 'border-gray-300');

    rerender(<Button variant='ghost'>Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-gray-700');

    rerender(<Button variant='danger'>Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-danger-600');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Button size='sm'>Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<Button size='md'>Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-sm');

    rerender(<Button size='lg'>Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('handles loading state correctly', () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button')).toContainHTML('svg');
  });

  it('handles disabled state correctly', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveClass(
      'disabled:opacity-50',
      'disabled:cursor-not-allowed'
    );
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} loading>
        Loading
      </Button>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<Button className='custom-class'>Custom</Button>);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('forwards additional props', () => {
    render(
      <Button type='submit' data-testid='submit-button'>
        Submit
      </Button>
    );

    const button = screen.getByTestId('submit-button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('has proper focus styles', () => {
    render(<Button>Focus me</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2'
    );
  });

  it('is accessible', () => {
    render(<Button>Accessible Button</Button>);

    const button = screen.getByRole('button', { name: /accessible button/i });
    expect(button).toBeInTheDocument();
  });
});
