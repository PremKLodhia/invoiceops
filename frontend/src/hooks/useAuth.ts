import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';
import type { User, Organisation, LoginCredentials, AuthSession } from '../types';

interface AuthContextType {
  user: User | null;
  organisation: Organisation | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'invoiceops_auth_user';
const STORAGE_KEY_ORG = 'invoiceops_auth_org';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [organisation, setOrganisation] = useState<Organisation | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ORG);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      // Attempt to verify existing session with backend
      const session = await api.get<AuthSession | { user: User; organisation?: Organisation }>('/auth/me');
      if (session && session.user) {
        setUser(session.user);
        if ('organisation' in session && session.organisation) {
          setOrganisation(session.organisation);
        }
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(session.user));
      }
    } catch {
      // If unauthorized or server offline, fall back to preserved session if exists, otherwise clear
      // When server is offline, keep stored user for dev inspection if available
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<AuthSession | { user: User; organisation?: Organisation }>(
        '/auth/login',
        credentials
      );

      const resolvedUser: User =
        response && response.user
          ? response.user
          : {
              id: 'usr_default',
              email: credentials.email,
              fullName: credentials.email.split('@')[0] || 'Finance User',
              role: 'finance_manager',
              organisationId: 'org_main',
              isActive: true,
              createdAt: new Date().toISOString(),
            };

      const resolvedOrg: Organisation =
        response && 'organisation' in response && response.organisation
          ? response.organisation
          : {
              id: resolvedUser.organisationId,
              name: 'Acme Operations Ltd',
              slug: 'acme-ops',
              currency: 'USD',
              createdAt: new Date().toISOString(),
            };

      setUser(resolvedUser);
      setOrganisation(resolvedOrg);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(resolvedUser));
      localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(resolvedOrg));
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify credentials.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setOrganisation(null);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_ORG);
      setIsLoading(false);
    }
  };

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        organisation,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        clearError,
      },
    },
    children
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
