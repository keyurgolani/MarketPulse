import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { useLoginForm } from '@/hooks/useAuthForm';

// Mock the useLoginForm hook
jest.mock('@/hooks/useAuthForm');

const mockUseLoginForm = useLoginForm as jest.MockedFunction<typeof useLoginForm>;

describe('LoginForm', () => {
  const mockUpdateField = jest.fn();
  const mockSubmitForm = jest.fn();
  const mockResetForm = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnSwitchToRegister = jest.fn();

  const defaultHookReturn = {
    formData: {
      email: '',
      password: '',
    },
    updateField: mockUpdateField,
    submitForm: mockSubmitForm,
    resetForm: mockResetForm,
    isSubmitting: false,
    errors: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoginForm.mockReturnValue(defaultHookReturn);
  });

  it('should render login form correctly', () => {
    render(<LoginForm />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should call updateField when email input changes', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'test@example.com');

    expect(mockUpdateField).toHaveBeenCalledWith('email', 'test@example.com');
  });

  it('should call updateField when password input changes', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'password123');

    expect(mockUpdateField).toHaveBeenCalledWith('password', 'password123');
  });

  it('should call submitForm when form is submitted', async () => {
    mockSubmitForm.mockResolvedValue(true);
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitForm).toHaveBeenCalled();
    });
  });

  it('should call onSuccess when form submission is successful', async () => {
    mockSubmitForm.mockResolvedValue(true);
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const form = screen.getByRole('form') || screen.getByTestId('login-form') || 
                 screen.getByLabelText(/email address/i).closest('form');
    
    if (form) {
      fireEvent.submit(form);
    } else {
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should not call onSuccess when form submission fails', async () => {
    mockSubmitForm.mockResolvedValue(false);
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitForm).toHaveBeenCalled();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should display validation errors', () => {
    mockUseLoginForm.mockReturnValue({
      ...defaultHookReturn,
      errors: {
        email: 'Email is required',
        password: 'Password is required',
      },
    });

    render(<LoginForm />);

    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('should display general error', () => {
    mockUseLoginForm.mockReturnValue({
      ...defaultHookReturn,
      errors: {
        general: 'Invalid credentials',
      },
    });

    render(<LoginForm />);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('should disable form when submitting', () => {
    mockUseLoginForm.mockReturnValue({
      ...defaultHookReturn,
      isSubmitting: true,
    });

    render(<LoginForm />);

    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('should show switch to register link when onSwitchToRegister is provided', () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);

    const switchLink = screen.getByRole('button', { name: /sign up here/i });
    expect(switchLink).toBeInTheDocument();

    fireEvent.click(switchLink);
    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  it('should not show switch to register link when onSwitchToRegister is not provided', () => {
    render(<LoginForm />);

    expect(screen.queryByRole('button', { name: /sign up here/i })).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    mockUseLoginForm.mockReturnValue({
      ...defaultHookReturn,
      errors: {
        email: 'Email is required',
      },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('autoComplete', 'email');

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
  });
});