import { useContext } from 'react';
import AuthContext, { AuthContextType } from '@/contexts/AuthContext';

/**
 * Custom hook to access authentication context
 * @returns AuthContextType - Authentication context with state and methods
 * @throws Error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth;