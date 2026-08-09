import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { api } from './api';
import { useAuth } from './auth';

// the header bell needs the unread count on every screen, so it lives here
// instead of in the notifications page

const POLL_MS = 60_000;

interface NotificationsValue {
  unread: number;
  refresh: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue>({
  unread: 0,
  refresh: () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const userId = me?.id ?? null;
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (!userId) {
      setUnread(0);
      return;
    }
    api<{ unread: number }>('/me/notifications/unread')
      .then((r) => setUnread(r.unread))
      .catch(() => {
        // offline or a dropped token, the next tick tries again
      });
  }, [userId]);

  useEffect(() => {
    refresh();
    if (!userId) return;
    const timer = setInterval(refresh, POLL_MS);
    // coming back to the tab is the moment a stale counter is most visible
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [userId, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      setUnread((n) => Math.max(0, n - 1));
      try {
        await api(`/me/notifications/${id}/read`, { method: 'POST' });
      } finally {
        refresh();
      }
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    setUnread(0);
    try {
      await api('/me/notifications/read', { method: 'POST' });
    } finally {
      refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ unread, refresh, markRead, markAllRead }),
    [unread, refresh, markRead, markAllRead]
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
