import React from 'react';
import { Pressable } from 'react-native';
import { LOCALES, tokens, type Locale, type MeView } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';

// compact header switcher, taps cycle uz -> ru -> en
export function LocaleSwitch() {
  const { locale, setLocale } = useI18n();
  const { me } = useAuth();

  const next = () => {
    const idx = LOCALES.indexOf(locale);
    const nextLocale: Locale = LOCALES[(idx + 1) % LOCALES.length] ?? 'uz';
    setLocale(nextLocale);
    if (me) {
      api<MeView>('/me', { method: 'PATCH', body: { locale: nextLocale } }).catch(() => {});
    }
  };

  return (
    <Pressable
      onPress={next}
      hitSlop={tokens.hitSlop}
      style={{
        borderWidth: 1,
        borderColor: tokens.colors.gray150,
        borderRadius: tokens.radius.sm,
        paddingVertical: 3,
        paddingHorizontal: tokens.spacing.sm,
      }}
    >
      <AppText variant="tiny" weight="semibold">
        {locale.toUpperCase()}
      </AppText>
    </Pressable>
  );
}
