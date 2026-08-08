import React from 'react';
import type { PolicyBadge } from '@rentqil/shared';
import { Badge } from '@/ui/bits';
import { useI18n } from '@/lib/i18n';

// compact drops the late refund tail, catalog cards have no room for it
export function PolicyBadgeView({ badge, compact }: { badge: PolicyBadge; compact?: boolean }) {
  const { t } = useI18n();
  if (badge.kind === 'no_refund') {
    return <Badge text={t('policy.noRefund')} tone="danger" />;
  }
  const text =
    t('policy.freeUntil', { hours: badge.hours }) +
    (!compact && badge.latePercent > 0 ? `, ${t('policy.lateRefund', { percent: badge.latePercent })}` : '');
  return <Badge text={text} tone="success" />;
}
