import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MeView } from '@rentqil/shared';
import { api, setAuthToken } from './api';

const TOKEN_KEY = 'rentqil.token';

interface AuthContextValue {
  me: MeView | null;
  loading: boolean;
  setSession: (token: string, me: MeView) => Promise<void>;
  // google redirect hands us just a token, /me completes the session
  loginWithToken: (token: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  me: null,
  loading: true,
  setSession: async () => {},
  loginWithToken: async () => {},
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          const current = await api<MeView>('/me');
          setMe(current);
        }
      } catch {
        // stale or revoked token, drop it
        setAuthToken(null);
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setSession = useCallback(async (token: string, nextMe: MeView) => {
    setAuthToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setMe(nextMe);
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    setAuthToken(token);
    const current = await api<MeView>('/me');
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setMe(current);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setMe(await api<MeView>('/me'));
    } catch {
      // keep the old state on network errors
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ me, loading, setSession, loginWithToken, refresh, logout }),
    [me, loading, setSession, loginWithToken, refresh, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
