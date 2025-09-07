import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder='Enter text' />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Enter text');
  });

  it('renders with label', () => {
    render(<Input label='Email Address' />);

    const label = screen.getByText('Email Address');
    const input = screen.getByRole('textbox');

    expect(label).toBeInTheDocument();
    expect(input).toHaveAccessibleName('Email Address');
  });

  it('displays error message', () => {
    render(<Input label='Email' error='Invalid email address' />);

    const input = screen.getByRole('textbox');
    const errorMessage = screen.getByText('Invalid email address');

    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveAttribute('role', 'alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('ring-danger-300');
  });

  it('displays helper text', () => {
    render(
      <Input label='Password' helperText='Must be at least 8 characters' />
    );

    const helperText = screen.getByText('Must be at least 8 characters');
    expect(helperText).toBeInTheDocument();
  });

  it('prioritizes error over helper text', () => {
    render(
      <Input
        label='Email'
        error='Invalid email'
        helperText='Enter your email address'
      />
    );

    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(
      screen.queryByText('Enter your email address')
    ).not.toBeInTheDocument();
  });

  it('renders with left icon', () => {
    const icon = <span data-testid='left-icon'>@</span>;
    render(<Input leftIcon={icon} />);

    const input = screen.getByRole('textbox');
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(input).toHaveClass('pl-10');
  });

  it('renders with right icon', () => {
    const icon = <span data-testid='right-icon'>✓</span>;
    render(<Input rightIcon={icon} />);

    const input = screen.getByRole('textbox');
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(input).toHaveClass('pr-10');
  });

  it('handles disabled state', () => {
    render(<Input disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('bg-gray-50', 'text-gray-500');
  });

  it('calls onChange handler', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<Input className='custom-input' />);

    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });

  it('generates unique id when not provided', () => {
    render(<Input label='Test' />);

    const input = screen.getByRole('textbox');
    const id = input.getAttribute('id');

    expect(id).toBeTruthy();
    expect(id).toMatch(/^input-/);
  });

  it('uses provided id', () => {
    render(<Input id='custom-id' label='Test' />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('associates error with input via aria-describedby', () => {
    render(<Input id='test-input' error='Error message' />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
  });

  it('associates helper text with input via aria-describedby', () => {
    render(<Input id='test-input' helperText='Helper text' />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-helper');
  });

  it('forwards additional props', () => {
    render(<Input type='email' data-testid='email-input' />);

    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('is accessible', () => {
    render(<Input label='Accessible Input' />);

    const input = screen.getByRole('textbox', { name: /accessible input/i });
    expect(input).toBeInTheDocument();
  });
});
