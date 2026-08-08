import React from 'react';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { VenueForm } from '@/components/owner/VenueForm';

export default function NewVenueScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { ready } = useRequireRole('owner', 'admin');

  if (!ready) return <Screen title={t('owner.newVenue')} back>{null}</Screen>;

  return (
    <Screen title={t('owner.newVenue')} back>
      <VenueForm onSaved={(venue) => router.replace(`/owner/venue/${venue.id}`)} />
    </Screen>
  );
}
