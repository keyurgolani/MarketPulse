import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { LoginCredentials, RegisterData } from '@/services/authService';

// Form validation errors
export interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  first_name?: string;
  last_name?: string;
  general?: string;
}

// Login form state
export interface LoginFormState {
  email: string;
  password: string;
}

// Register form state
export interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
}

// Form submission state
export interface FormSubmissionState {
  isSubmitting: boolean;
  errors: FormErrors;
}

/**
 * Custom hook for login form management
 */
export const useLoginForm = (): {
  formData: LoginFormState;
  errors: Record<string, string>;
  isLoading: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearErrors: () => void;
} => {
  const { login, clearError } = useAuth();

  const [formData, setFormData] = useState<LoginFormState>({
    email: '',
    password: '',
  });

  const [submissionState, setSubmissionState] = useState<FormSubmissionState>({
    isSubmitting: false,
    errors: {},
  });

  // Update form field
  const updateField = useCallback(
    (field: keyof LoginFormState, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear field-specific error when user starts typing
      if (submissionState.errors[field]) {
        setSubmissionState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [field]: undefined },
        }));
      }
    },
    [submissionState.errors]
  );

  // Validate login form
  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = {};

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    return errors;
  }, [formData]);

  // Submit login form
  const submitForm = useCallback(async (): Promise<boolean> => {
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setSubmissionState((prev) => ({ ...prev, errors }));
      return false;
    }

    setSubmissionState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));
    clearError();

    try {
      await login(formData as LoginCredentials);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed';
      setSubmissionState((prev) => ({
        ...prev,
        errors: { general: errorMessage },
      }));
      return false;
    } finally {
      setSubmissionState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [formData, validateForm, login, clearError]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({ email: '', password: '' });
    setSubmissionState({ isSubmitting: false, errors: {} });
  }, []);

  return {
    formData,
    updateField,
    submitForm,
    resetForm,
    isSubmitting: submissionState.isSubmitting,
    errors: submissionState.errors,
  };
};

/**
 * Custom hook for register form management
 */
export const useRegisterForm = (): {
  formData: RegisterFormState;
  errors: Record<string, string>;
  isLoading: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearErrors: () => void;
} => {
  const { register, clearError } = useAuth();

  const [formData, setFormData] = useState<RegisterFormState>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
  });

  const [submissionState, setSubmissionState] = useState<FormSubmissionState>({
    isSubmitting: false,
    errors: {},
  });

  // Update form field
  const updateField = useCallback(
    (field: keyof RegisterFormState, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear field-specific error when user starts typing
      if (submissionState.errors[field]) {
        setSubmissionState((prev) => ({
          ...prev,
          errors: { ...prev.errors, [field]: undefined },
        }));
      }
    },
    [submissionState.errors]
  );

  // Validate register form
  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password =
        'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // First name validation
    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    } else if (formData.first_name.length > 100) {
      errors.first_name = 'First name must be less than 100 characters';
    }

    // Last name validation
    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    } else if (formData.last_name.length > 100) {
      errors.last_name = 'Last name must be less than 100 characters';
    }

    return errors;
  }, [formData]);

  // Submit register form
  const submitForm = useCallback(async (): Promise<boolean> => {
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setSubmissionState((prev) => ({ ...prev, errors }));
      return false;
    }

    setSubmissionState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));
    clearError();

    try {
      const registerData: RegisterData = {
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
      };

      await register(registerData);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Registration failed';
      setSubmissionState((prev) => ({
        ...prev,
        errors: { general: errorMessage },
      }));
      return false;
    } finally {
      setSubmissionState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [formData, validateForm, register, clearError]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
    });
    setSubmissionState({ isSubmitting: false, errors: {} });
  }, []);

  return {
    formData,
    updateField,
    submitForm,
    resetForm,
    isSubmitting: submissionState.isSubmitting,
    errors: submissionState.errors,
  };
};
