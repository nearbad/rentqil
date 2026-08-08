import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Circle } from 'lucide-react-native';
import type { BookingView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { money } from '@/lib/format';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/bits';

export function splitLink(token: string): string {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/s/${token}`;
  }
  return `/s/${token}`;
}

export function SplitSection({ booking, onChanged }: { booking: BookingView; onChanged?: () => void }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const paid = booking.participants.filter((p) => p.status === 'paid').length;
  const total = booking.participants.length;

  const copy = async () => {
    if (!booking.splitToken) return;
    await Clipboard.setStringAsync(splitLink(booking.splitToken));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card style={{ gap: tokens.spacing.md }}>
      <AppText variant="h3">{t('split.title')}</AppText>
      <AppText variant="small" color={tokens.colors.gray500}>
        {t('split.progress', { paid, total })}
      </AppText>

      <View style={{ height: 8, backgroundColor: tokens.colors.gray150, overflow: 'hidden' }}>
        <View
          style={{
            width: `${Math.round((paid / Math.max(total, 1)) * 100)}%`,
            height: '100%',
            backgroundColor: tokens.colors.text,
          }}
        />
      </View>

      <View style={{ gap: tokens.spacing.sm }}>
        {booking.participants.map((p, i) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
            {p.status === 'paid' ? (
              <CheckCircle2 size={18} color={tokens.colors.success} strokeWidth={1.8} />
            ) : (
              <Circle size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
            )}
            <AppText variant="small" style={{ flex: 1 }}>
              {p.fullName || `#${i + 1}`}
              {p.isCreator ? ' · ' + t('split.shareCreator') : ''}
            </AppText>
            <AppText variant="small" color={tokens.colors.gray500}>
              {money(p.shareTiyin, locale)}
            </AppText>
          </View>
        ))}
      </View>

      {booking.status === 'pending_payment' && booking.splitToken ? (
        <View style={{ gap: tokens.spacing.sm }}>
          <AppText variant="tiny" color={tokens.colors.gray500}>
            {t('split.invite')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title={copied ? t('common.copied') : t('common.copy')}
                variant="secondary"
                small
                onPress={copy}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t('common.open')}
                variant="secondary"
                small
                onPress={() => {
                  onChanged?.();
                  router.push(`/s/${booking.splitToken}`);
                }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </Card>
  );
}
