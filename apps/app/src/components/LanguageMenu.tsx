import React from 'react';
import { Pressable } from 'react-native';
import { ChevronDown, Globe } from 'lucide-react-native';
import { LOCALES, tokens, type Locale, type MeView } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { MenuItem, Popover } from '@/ui/Popover';

// each language shows its own name, this list is not translated
const LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

export function LanguageMenu() {
  const { locale, setLocale } = useI18n();
  const { me } = useAuth();

  const pick = (next: Locale) => {
    setLocale(next);
    if (me) {
      // server sync is best effort, the local switch already happened
      api<MeView>('/me', { method: 'PATCH', body: { locale: next } }).catch(() => {});
    }
  };

  return (
    <Popover
      align="right"
      menuWidth={180}
      renderTrigger={(open) => (
        <Pressable
          onPress={open}
          hitSlop={tokens.hitSlop}
          style={({ hovered }: { hovered?: boolean }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            borderWidth: 1,
            borderColor: hovered ? tokens.colors.gray300 : tokens.colors.gray150,
            borderRadius: tokens.radius.sm,
            paddingVertical: 6,
            paddingHorizontal: tokens.spacing.sm,
          })}
        >
          <Globe size={14} color={tokens.colors.gray700} strokeWidth={1.6} />
          <AppText variant="small" weight="semibold">
            {locale.toUpperCase()}
          </AppText>
          <ChevronDown size={13} color={tokens.colors.gray500} strokeWidth={1.8} />
        </Pressable>
      )}
    >
      {(close) => (
        <>
          {LOCALES.map((code) => (
            <MenuItem
              key={code}
              label={LABELS[code]}
              selected={code === locale}
              onPress={() => {
                pick(code);
                close();
              }}
            />
          ))}
        </>
      )}
    </Popover>
  );
}
