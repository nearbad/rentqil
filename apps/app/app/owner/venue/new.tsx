import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import type { PlatformConfigView } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { VenueForm } from '@/components/owner/VenueForm';

export default function NewVenueScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { ready } = useRequireRole('owner', 'admin');
  const [config, setConfig] = useState<PlatformConfigView | null>(null);

  useEffect(() => {
    api<PlatformConfigView>('/config').then(setConfig).catch(() => {});
  }, []);

  if (!ready) return <Screen title={t('owner.newVenue')} back>{null}</Screen>;

  return (
    <Screen title={t('owner.newVenue')} back>
      <VenueForm
        depositBounds={config ? { min: config.minDepositPercent, max: config.maxDepositPercent } : undefined}
        onSaved={(venue) => router.replace(`/owner/venue/${venue.id}`)}
      />
    </Screen>
  );
}
