import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { OwnerVenueView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Badge, Card, Divider, Loading } from '@/ui/bits';
import { Toggle } from '@/ui/Toggle';
import { VenueForm } from '@/components/owner/VenueForm';

function PolicyEditor({ venue, onSaved }: { venue: OwnerVenueView; onSaved: () => void }) {
  const { t } = useI18n();
  const [refundEnabled, setRefundEnabled] = useState(venue.policy.refundEnabled);
  const [freeHours, setFreeHours] = useState(String(venue.policy.freeCancelHours));
  const [latePercent, setLatePercent] = useState(String(venue.policy.lateRefundPercent));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/owner/venues/${venue.id}/policy`, {
        method: 'PUT',
        body: {
          refundEnabled,
          freeCancelHours: parseInt(freeHours, 10) || 0,
          lateRefundPercent: parseInt(latePercent, 10) || 0,
        },
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: tokens.spacing.md }}>
      <AppText variant="h3">{t('owner.policy')}</AppText>
      <Toggle label={t('owner.policyRefundEnabled')} value={refundEnabled} onChange={setRefundEnabled} />
      {refundEnabled ? (
        <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label={t('owner.policyFreeHours')} value={freeHours} onChangeText={setFreeHours} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t('owner.policyLatePercent')} value={latePercent} onChangeText={setLatePercent} keyboardType="number-pad" />
          </View>
        </View>
      ) : null}
      <Button title={t('common.save')} onPress={save} loading={busy} variant="secondary" small />
    </Card>
  );
}

export default function OwnerVenueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { sportName } = useSports();
  const router = useRouter();
  const { ready } = useRequireRole('owner', 'admin');

  const [venue, setVenue] = useState<OwnerVenueView | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    api<OwnerVenueView>(`/owner/venues/${id}`).then(setVenue).catch(() => {});
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (ready) load();
    }, [ready, load])
  );

  if (!ready || !venue) {
    return (
      <Screen title={t('owner.venues')} back>
        {ready ? <Loading /> : null}
      </Screen>
    );
  }

  return (
    <Screen title={venue.name} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
          <Badge
            text={t(`owner.venueStatus.${venue.status}`)}
            tone={venue.status === 'approved' ? 'success' : venue.status === 'rejected' ? 'danger' : 'neutral'}
          />
          {venue.hasPendingChanges ? <Badge text={t('owner.pendingChanges')} /> : null}
        </View>
        {venue.moderationComment ? (
          <AppText variant="small" color={tokens.colors.danger}>
            {t('owner.moderationComment')}: {venue.moderationComment}
          </AppText>
        ) : null}

        <Button
          title={editing ? t('common.close') : t('owner.editVenue')}
          variant="secondary"
          onPress={() => setEditing((v) => !v)}
        />
        {editing ? (
          <VenueForm
            initial={venue}
            onSaved={(v) => {
              setVenue(v);
              setEditing(false);
            }}
          />
        ) : null}

        <PolicyEditor venue={venue} onSaved={load} />

        <Divider />

        <AppText variant="h3">{t('owner.schedulePrices')}</AppText>
        <View style={{ gap: tokens.spacing.sm }}>
          {venue.courts.map((court) => (
            <Pressable
              key={court.id}
              onPress={() => router.push(`/owner/venue/${venue.id}/court/${court.id}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: tokens.colors.gray150,
                borderRadius: tokens.radius.md,
                padding: tokens.spacing.lg,
                gap: tokens.spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText weight="medium">{court.name}</AppText>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {sportName(court.sport)} · {court.indoor ? t('court.indoor') : t('court.outdoor')}
                </AppText>
              </View>
              <ChevronRight size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
            </Pressable>
          ))}
        </View>

      </View>
    </Screen>
  );
}
