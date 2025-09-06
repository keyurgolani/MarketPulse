import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm, RegisterForm } from '@/components/forms';
import { useAuth } from '@/hooks/useAuth';

export const Login: React.FC = (): React.JSX.Element => {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from =
        (location.state as { from?: { pathname?: string } })?.from?.pathname ??
        '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleAuthSuccess = (): void => {
    const from =
      (location.state as { from?: { pathname?: string } })?.from?.pathname ??
      '/';
    navigate(from, { replace: true });
  };

  const switchToRegister = (): void => {
    setIsLogin(false);
  };

  const switchToLogin = (): void => {
    setIsLogin(true);
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            MarketPulse
          </h1>
          <p className='mt-2 text-gray-600 dark:text-gray-400'>
            Your Financial Dashboard
          </p>
        </div>
      </div>

      <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'>
        {isLogin ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={switchToRegister}
          />
        ) : (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </div>

      <div className='mt-8 text-center'>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
