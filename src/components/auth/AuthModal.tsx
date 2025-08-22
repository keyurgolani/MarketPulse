/**
 * Authentication Modal Component
 * Provides a modal interface for login and registration
 */

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { PasswordResetForm } from './PasswordResetForm';

export interface AuthModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Initial mode to show */
  initialMode?: 'login' | 'register' | 'reset';
  /** Callback when authentication is successful */
  onSuccess?: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  const handleSuccess = (): void => {
    onSuccess?.();
    onClose();
  };

  const handleModeChange = (newMode: AuthMode): void => {
    setMode(newMode);
  };

  const renderContent = (): React.ReactNode => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSuccess={handleSuccess}
            onRegisterClick={() => handleModeChange('register')}
            onForgotPasswordClick={() => handleModeChange('reset')}
          />
        );
      case 'register':
        return (
          <RegisterForm
            onSuccess={handleSuccess}
            onLoginClick={() => handleModeChange('login')}
          />
        );
      case 'reset':
        return (
          <PasswordResetForm
            onSuccess={() => handleModeChange('login')}
            onLoginClick={() => handleModeChange('login')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="md" className="p-0">
      {renderContent()}
    </Modal>
  );
};
