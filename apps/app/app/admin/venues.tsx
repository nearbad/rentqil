import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import type { OwnerVenueView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Badge, Card, Chip, EmptyState, Loading } from '@/ui/bits';
import { Input } from '@/ui/Input';
import { VenueForm } from '@/components/owner/VenueForm';

interface AdminVenueRow extends OwnerVenueView {
  ownerEmail: string | null;
  ownerName: string | null;
}

const STATUS_TONES = { approved: 'success', rejected: 'danger', pending: 'neutral' } as const;

// the admin sees and edits every venue directly, changes skip moderation
export default function AdminVenuesScreen() {
  const { t } = useI18n();
  const { ready } = useRequireRole('admin');
  const [items, setItems] = useState<AdminVenueRow[] | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AdminVenueRow | null>(null);

  const load = useCallback(() => {
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    api<{ items: AdminVenueRow[] }>(`/admin/venues${qs}`)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [q]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [ready, load]);

  if (!ready) return <Screen title={t('admin.venues')} back>{null}</Screen>;

  const setStatus = async (venue: AdminVenueRow, status: OwnerVenueView['status']) => {
    try {
      await api(`/admin/venues/${venue.id}`, { method: 'PATCH', body: { status } });
      load();
    } catch {
      // the reload shows the real state
    }
  };

  if (editing) {
    return (
      <Screen title={editing.name} back>
        <View style={{ gap: tokens.spacing.lg }}>
          <Pressable
            onPress={() => setEditing(null)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}
          >
            <ChevronLeft size={16} color={tokens.colors.gray700} strokeWidth={1.6} />
            <AppText variant="small" color={tokens.colors.gray700}>
              {t('common.back')}
            </AppText>
          </Pressable>
          <AppText variant="tiny" color={tokens.colors.gray500}>
            {t('admin.adminEditNote')}
          </AppText>
          <VenueForm
            initial={editing}
            patchPath={`/admin/venues/${editing.id}`}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('admin.venues')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <Input value={q} onChangeText={setQ} placeholder={t('admin.venueSearch')} />

        {items === null ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState title={t('catalog.empty')} />
        ) : (
          <View style={{ gap: tokens.spacing.md }}>
            {items.map((venue) => (
              <Card key={venue.id} style={{ gap: tokens.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                  <AppText variant="h3" style={{ flex: 1 }} numberOfLines={1}>
                    {venue.name}
                  </AppText>
                  <Badge
                    text={t(`owner.venueStatus.${venue.status}`)}
                    tone={STATUS_TONES[venue.status]}
                  />
                </View>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {venue.district} · {venue.address}
                </AppText>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {venue.ownerName ?? ''} {venue.ownerEmail ?? ''}
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
                  <Chip label={t('common.edit')} onPress={() => setEditing(venue)} />
                  {venue.status !== 'approved' ? (
                    <Chip label={t('admin.approve')} onPress={() => setStatus(venue, 'approved')} />
                  ) : (
                    <Chip label={t('admin.reject')} onPress={() => setStatus(venue, 'rejected')} />
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
