'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/api';
import { tokenStorage } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  permissions: string[];
  avatarUrl?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  currency: string;
  timezone: string;
  logoUrl?: string;
  plan: 'starter' | 'professional' | 'enterprise';
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSubdomain?: string;
  rememberMe?: boolean;
}

export interface AuthContextValue {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

interface LoginApiResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
}

// ─── Helpers to normalise API response into rich frontend types ───────────────
function toUser(raw: LoginApiResponse['user']): User {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName ?? '',
    lastName: raw.lastName ?? '',
    fullName: [raw.firstName, raw.lastName].filter(Boolean).join(' ') || raw.email,
    role: 'Admin', // default — backend can extend later
    permissions: [],
    avatarUrl: undefined,
  };
}

function toTenant(raw: LoginApiResponse['tenant']): Tenant {
  return {
    id: raw.id,
    name: raw.name,
    subdomain: raw.subdomain ?? '',
    currency: 'JOD',
    timezone: 'Asia/Amman',
    logoUrl: undefined,
    plan: 'starter',
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Rehydrate from storage on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('aierp_user');
      const storedTenant = localStorage.getItem('aierp_tenant');
      const accessToken = tokenStorage.getAccess();

      if (storedUser && storedTenant && accessToken) {
        setUser(JSON.parse(storedUser) as User);
        setTenant(JSON.parse(storedTenant) as Tenant);
      }
    } catch {
      // Corrupt storage — clear everything
      tokenStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await post<LoginApiResponse>('/auth/login', credentials);

      tokenStorage.setAccess(response.accessToken);
      tokenStorage.setRefresh(response.refreshToken);
      tokenStorage.setTenantId(response.tenant.id);

      const richUser = toUser(response.user);
      const richTenant = toTenant(response.tenant);

      localStorage.setItem('aierp_user', JSON.stringify(richUser));
      localStorage.setItem('aierp_tenant', JSON.stringify(richTenant));

      setUser(richUser);
      setTenant(richTenant);

      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      const refreshToken = tokenStorage.getRefresh();
      if (refreshToken) {
        await post('/auth/logout', { refreshToken }).catch(() => {
          // Best-effort — clear locally regardless
        });
      }
    } finally {
      tokenStorage.clear();
      localStorage.removeItem('aierp_user');
      localStorage.removeItem('aierp_tenant');
      setUser(null);
      setTenant(null);
      router.push('/login');
    }
  }, [router]);

  // ── Permission helpers ───────────────────────────────────────────────────
  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const hasRole = useCallback(
    (role: string) => user?.role === role,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tenant,
      isAuthenticated: !!user && !!tokenStorage.getAccess(),
      isLoading,
      login,
      logout,
      hasPermission,
      hasRole,
    }),
    [user, tenant, isLoading, login, logout, hasPermission, hasRole],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

// ─── Protected Route HOC ─────────────────────────────────────────────────────
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: string,
) {
  const WrappedComponent = (props: P) => {
    const { isAuthenticated, isLoading, hasPermission } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/login');
      }
      if (!isLoading && isAuthenticated && requiredPermission && !hasPermission(requiredPermission)) {
        router.push('/dashboard');
      }
    }, [isAuthenticated, isLoading, hasPermission, router]);

    if (isLoading) {
      return React.createElement(
        'div',
        { className: 'min-h-screen flex items-center justify-center bg-surface-50' },
        React.createElement(
          'div',
          { className: 'flex flex-col items-center gap-3' },
          React.createElement('div', {
            className: 'h-10 w-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin',
          }),
          React.createElement('p', { className: 'text-sm text-surface-500' }, 'Loading…'),
        ),
      );
    }

    if (!isAuthenticated) return null;

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withAuth(${Component.displayName ?? Component.name})`;
  return WrappedComponent;
}
