import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { clearAuthTokens, mobileApi, setAuthTokens } from '@/src/services/api';
import { safeGetItem, safeRemoveItem, safeSetItem } from '@/src/services/safeStorage';
import type { Centre, MobileUser, Role } from '../types';

type LoginPayload = {
  email: string;
  password: string;
  role: Role;
  centreId: string;
};

type AuthContextValue = {
  user: MobileUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isSessionHydrating: boolean;
  loginOptions: {
    roles: Role[];
    centres: Centre[];
  };
  loadLoginOptions: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const FALLBACK_ROLES: Role[] = ['Super Admin', 'Admin', 'Doctor', 'Surgeon', 'Scrub Nurse', 'Anesthetist'];
const FALLBACK_CENTRES: Centre[] = [];

const STORAGE_KEYS = {
  user: 'carereach_mobile_auth_user',
  accessToken: 'carereach_mobile_auth_access_token',
  refreshToken: 'carereach_mobile_auth_refresh_token',
};

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSessionHydrating, setIsSessionHydrating] = useState(true);
  const [loginOptions, setLoginOptions] = useState<{ roles: Role[]; centres: Centre[] }>({
    roles: FALLBACK_ROLES,
    centres: FALLBACK_CENTRES,
  });

  const loadLoginOptions = async () => {
    try {
      const options = await mobileApi.auth.getLoginOptions();
      const filteredRoles = options.signInAs.filter((role) => role !== 'Data Entry');
      setLoginOptions({
        roles: filteredRoles.length ? filteredRoles : FALLBACK_ROLES,
        centres: options.catchmentAreas,
      });
    } catch {
      setLoginOptions({ roles: FALLBACK_ROLES, centres: FALLBACK_CENTRES });
    }
  };

  useEffect(() => {
    void loadLoginOptions();
  }, []);

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const [storedUserRaw, storedAccessToken, storedRefreshToken] = await Promise.all([
          safeGetItem(STORAGE_KEYS.user),
          safeGetItem(STORAGE_KEYS.accessToken),
          safeGetItem(STORAGE_KEYS.refreshToken),
        ]);

        if (!storedUserRaw || !storedRefreshToken) {
          return;
        }

        const parsedUser = JSON.parse(storedUserRaw) as MobileUser;
        setAuthTokens(storedAccessToken ?? '', storedRefreshToken);

        const refreshed = await mobileApi.auth.refresh();
        setAuthTokens(refreshed.accessToken, refreshed.refreshToken);

        await Promise.all([
          safeSetItem(STORAGE_KEYS.accessToken, refreshed.accessToken),
          safeSetItem(STORAGE_KEYS.refreshToken, refreshed.refreshToken),
        ]);

        setUser(parsedUser);
      } catch {
        clearAuthTokens();
        setUser(null);
        await Promise.all([
          safeRemoveItem(STORAGE_KEYS.user),
          safeRemoveItem(STORAGE_KEYS.accessToken),
          safeRemoveItem(STORAGE_KEYS.refreshToken),
        ]);
      } finally {
        setIsSessionHydrating(false);
      }
    };

    void hydrateSession();
  }, []);

  const login = async (payload: LoginPayload) => {
    setIsAuthLoading(true);
    try {
      const response = await mobileApi.auth.login(payload);
      setUser(response.user);

      await Promise.all([
        safeSetItem(STORAGE_KEYS.user, JSON.stringify(response.user)),
        safeSetItem(STORAGE_KEYS.accessToken, response.accessToken),
        safeSetItem(STORAGE_KEYS.refreshToken, response.refreshToken),
      ]);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    await mobileApi.auth.logout();
    setUser(null);

    await Promise.all([
      safeRemoveItem(STORAGE_KEYS.user),
      safeRemoveItem(STORAGE_KEYS.accessToken),
      safeRemoveItem(STORAGE_KEYS.refreshToken),
    ]);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoading,
      isSessionHydrating,
      loginOptions,
      loadLoginOptions,
      login,
      logout,
    }),
    [user, isAuthLoading, isSessionHydrating, loginOptions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useMobileAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useMobileAuth must be used within MobileAuthProvider');
  }
  return ctx;
}
