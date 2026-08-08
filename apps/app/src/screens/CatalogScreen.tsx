import React from 'react';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { EmptyState } from '@/ui/bits';

export function CatalogScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t('nav.catalog')}>
      <EmptyState title={t('catalog.empty')} />
    </Screen>
  );
}
