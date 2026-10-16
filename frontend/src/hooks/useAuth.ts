import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';
import type { User, Organisation, LoginCredentials } from '../types';

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
      const session = await api.get<any>('/auth/me');
      const resolvedUser: User | null = session?.user || (session?.id && session?.email ? session : null);
      if (resolvedUser) {
        setUser(resolvedUser);
        const orgName = session?.organisation?.name || resolvedUser.organisationName || 'Acme Industrial Holdings';
        const resolvedOrg: Organisation = {
          id: resolvedUser.organisationId,
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          currency: 'GBP',
          createdAt: new Date().toISOString(),
        };
        setOrganisation(resolvedOrg);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(resolvedUser));
        localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify(resolvedOrg));
      }
    } catch {
      // If unauthorized or server offline, fall back to preserved session if exists, otherwise clear
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
      const response = await api.post<any>('/auth/login', credentials);
      const userPayload: User | null = response?.user || (response?.id && response?.email ? response : null);

      if (!userPayload) {
        throw new Error('Authentication response did not contain valid user credentials.');
      }

      const resolvedUser: User = userPayload;
      const orgName = response?.organisation?.name || resolvedUser.organisationName || 'Acme Industrial Holdings';
      const resolvedOrg: Organisation = {
        id: resolvedUser.organisationId,
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        currency: 'GBP',
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
