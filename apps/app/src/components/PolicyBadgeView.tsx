import React from 'react';
import type { PolicyBadge } from '@rentqil/shared';
import { Badge } from '@/ui/bits';
import { useI18n } from '@/lib/i18n';

export function PolicyBadgeView({ badge }: { badge: PolicyBadge }) {
  const { t } = useI18n();
  if (badge.kind === 'no_refund') {
    return <Badge text={t('policy.noRefund')} tone="danger" />;
  }
  const text =
    t('policy.freeUntil', { hours: badge.hours }) +
    (badge.latePercent > 0 ? `, ${t('policy.lateRefund', { percent: badge.latePercent })}` : '');
  return <Badge text={text} tone="success" />;
}
