import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthContextType } from '../../types/auth/auth.types';
import authService from '../../services/auth/auth.service';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = authService.getUser();
      const token = authService.getToken();

      if (storedUser && token) {
        setUser(storedUser);
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (identificador: string, password: string): Promise<void> => {
    const response = await authService.login(identificador, password);

    if (response.success && response.data) {
      setUser(response.data.user);
    } else {
      throw new Error(response.message || 'Error al iniciar sesión');
    }
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
  };

  const refreshToken = async (): Promise<void> => {
    await authService.refreshToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
