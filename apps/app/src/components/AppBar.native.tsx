import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useNotifications } from '@/lib/notifications';
import { AppText } from '@/ui/AppText';
import { LanguageMenu } from './LanguageMenu';
import { LogoMark } from './LogoMark';

export interface AppBarProps {
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
}

const BAR_HEIGHT = 56;

// phone bar. one row of chrome, never two: a sub screen shows back plus its
// title, a tab root shows the wordmark with the language and bell actions.
export function AppBar({ title, back, right }: AppBarProps) {
  const { t } = useI18n();
  const { me } = useAuth();
  const { unread } = useNotifications();
  const router = useRouter();

  const bell = me ? (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={tokens.hitSlop}
      accessibilityLabel={unread > 0 ? t('notif.unread') : t('nav.notifications')}
    >
      {({ pressed }: { pressed: boolean }) => (
        <>
          <Bell
            size={21}
            color={pressed ? tokens.colors.text : tokens.colors.gray700}
            strokeWidth={1.6}
          />
          {unread > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: -1,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: tokens.colors.accent,
              }}
            />
          ) : null}
        </>
      )}
    </Pressable>
  ) : null;

  return (
    <View
      style={{
        borderBottomWidth: tokens.border,
        borderBottomColor: tokens.colors.text,
        backgroundColor: tokens.colors.bg,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: tokens.spacing.lg,
          height: BAR_HEIGHT,
          gap: tokens.spacing.md,
        }}
      >
        {back ? (
          <>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={tokens.hitSlop}
              accessibilityLabel={t('common.back')}
            >
              {({ pressed }: { pressed: boolean }) => (
                <ArrowLeft
                  size={22}
                  color={pressed ? tokens.colors.gray500 : tokens.colors.text}
                  strokeWidth={1.8}
                />
              )}
            </Pressable>
            <AppText variant="h3" style={{ flex: 1 }} numberOfLines={1}>
              {title}
            </AppText>
            {right}
          </>
        ) : (
          <>
            <Pressable
              onPress={() => router.push('/')}
              style={({ pressed }: { pressed: boolean }) => ({
                backgroundColor: tokens.colors.text,
                paddingVertical: 5,
                paddingHorizontal: tokens.spacing.md,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <LogoMark />
            </Pressable>
            <View style={{ flex: 1 }} />
            {right}
            <LanguageMenu />
            {bell}
          </>
        )}
      </View>
    </View>
  );
}
