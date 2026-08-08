import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import type { AdminUserView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Badge, Card, Divider, Loading } from '@/ui/bits';

interface ApplicationRow {
  userId: string;
  phone: string;
  name: string | null;
  message: string | null;
  createdAt: string;
}

function Applications() {
  const { t } = useI18n();
  const [items, setItems] = useState<ApplicationRow[] | null>(null);

  const load = useCallback(() => {
    api<{ items: ApplicationRow[] }>('/admin/applications')
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);

  useEffect(load, [load]);

  const decide = async (userId: string, approve: boolean) => {
    await api(`/admin/applications/${userId}`, { method: 'POST', body: { approve } });
    load();
  };

  if (!items || items.length === 0) return null;

  return (
    <View style={{ gap: tokens.spacing.md }}>
      <AppText variant="h3">{t('admin.ownerApplications')}</AppText>
      {items.map((a) => (
        <Card key={a.userId} style={{ gap: tokens.spacing.sm }}>
          <AppText weight="medium">
            {a.name ?? '-'} · {a.phone}
          </AppText>
          {a.message ? (
            <AppText variant="small" color={tokens.colors.gray500}>
              {a.message}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button title={t('admin.reject')} variant="danger" small onPress={() => decide(a.userId, false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={t('admin.approve')} small onPress={() => decide(a.userId, true)} />
            </View>
          </View>
        </Card>
      ))}
      <Divider />
    </View>
  );
}

export default function AdminUsersScreen() {
  const { t } = useI18n();
  const { ready } = useRequireRole('admin');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<AdminUserView[] | null>(null);

  const load = useCallback(() => {
    api<{ items: AdminUserView[] }>(`/admin/users${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [q]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [ready, load]);

  const toggleBlock = async (user: AdminUserView) => {
    await api(`/admin/users/${user.id}/block`, { method: 'POST', body: { blocked: !user.blocked } });
    load();
  };

  if (!ready) return <Screen title={t('admin.users')} back>{null}</Screen>;

  return (
    <Screen title={t('admin.users')} back>
      <View style={{ gap: tokens.spacing.md }}>
        <Applications />

        <Input value={q} onChangeText={setQ} placeholder={t('admin.userSearch')} autoCapitalize="none" />

        {items === null ? (
          <Loading />
        ) : (
          <View style={{ gap: tokens.spacing.sm }}>
            {items.map((user) => (
              <Card key={user.id} style={{ gap: tokens.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <AppText weight="medium">
                      {user.name ?? '-'} · {user.phone}
                    </AppText>
                    <AppText variant="tiny" color={tokens.colors.gray500}>
                      {user.role} · {t('owner.statsBookings').toLowerCase()}: {user.bookingsCount}
                    </AppText>
                  </View>
                  {user.blocked ? <Badge text={t('admin.block')} tone="danger" /> : null}
                </View>
                {user.role !== 'admin' ? (
                  <Button
                    title={user.blocked ? t('admin.unblock') : t('admin.block')}
                    variant={user.blocked ? 'secondary' : 'danger'}
                    small
                    onPress={() => toggleBlock(user)}
                  />
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
