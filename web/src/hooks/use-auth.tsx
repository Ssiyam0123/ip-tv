'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { authApi, setAccessToken, setCsrfToken } from '@/lib/api-client';
import type { User, LoginInput, RegisterInput } from '@/lib/api.types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = 'iptv_auth';

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: User;
}

function loadStoredAuth(): StoredAuth | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredAuth;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function storeAuth(auth: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = loadStoredAuth();
    if (stored) {
      setAccessToken(stored.accessToken);
      setUser(stored.user);
    }
    setIsLoading(false);
  }, []);

  const handleAuthResponse = useCallback(
    (response: { data: { user: User; accessToken: string; refreshToken: string } }) => {
      const { user, accessToken: token, refreshToken } = response.data;
      setAccessToken(token);
      setUser(user);
      storeAuth({
        accessToken: token,
        refreshToken,
        user,
      });
    },
    [],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await authApi.login(input);
      handleAuthResponse(response);
    },
    [handleAuthResponse],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await authApi.register(input);
      handleAuthResponse(response);
    },
    [handleAuthResponse],
  );

  const logout = useCallback(async () => {
    try {
      const stored = loadStoredAuth();
      if (stored) {
        await authApi.logout(stored.refreshToken);
      }
    } catch {
      // Continue with local logout even if API fails
    }
    setAccessToken(null);
    setCsrfToken(null);
    setUser(null);
    clearStoredAuth();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      const userData = res.data;
      setUser(userData);

      const stored = loadStoredAuth();
      if (stored) {
        storeAuth({ ...stored, user: userData });
      }
    } catch {
      // Token expired, clear auth
      setAccessToken(null);
      setUser(null);
      clearStoredAuth();
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    setAccessToken(null);
    setCsrfToken(null);
    setUser(null);
    clearStoredAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
