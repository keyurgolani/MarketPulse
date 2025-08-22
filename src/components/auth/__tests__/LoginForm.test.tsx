/**
 * LoginForm Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm';
import { useUserStore } from '@/stores/userStore';

// Mock the user store
vi.mock('@/stores/userStore', () => ({
  useUserStore: vi.fn(),
}));

const mockSetUser = vi.fn();
const mockUseUserStore = useUserStore as any;

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserStore.mockReturnValue({
      setUser: mockSetUser,
    });
  });

  it('renders login form correctly', () => {
    render(<LoginForm />);

    expect(
      screen.getByRole('heading', { name: 'Sign In' })
    ).toBeInTheDocument();
    expect(screen.getByText('Welcome back to MarketPulse')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it('handles form input changes', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('disables submit button when form is invalid', () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when form is valid', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(submitButton).not.toBeDisabled();
  });

  it('handles form submission', async () => {
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(screen.getByText('Signing in...')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(mockSetUser).toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('handles remember me checkbox', () => {
    render(<LoginForm />);

    const rememberMeCheckbox = screen.getByLabelText('Remember me');
    expect(rememberMeCheckbox).not.toBeChecked();

    fireEvent.click(rememberMeCheckbox);
    expect(rememberMeCheckbox).toBeChecked();
  });

  it('calls register callback when register button is clicked', () => {
    const onRegisterClick = vi.fn();
    render(<LoginForm onRegisterClick={onRegisterClick} />);

    const registerButton = screen.getByText('Sign up');
    fireEvent.click(registerButton);

    expect(onRegisterClick).toHaveBeenCalled();
  });

  it('calls forgot password callback when forgot password button is clicked', () => {
    const onForgotPasswordClick = vi.fn();
    render(<LoginForm onForgotPasswordClick={onForgotPasswordClick} />);

    const forgotPasswordButton = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordButton);

    expect(onForgotPasswordClick).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email Address');
    const passwordInput = screen.getByLabelText('Password');

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
  });
});
