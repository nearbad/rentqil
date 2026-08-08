import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Bell, LayoutDashboard, ShieldCheck, User } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { LanguageMenu } from './LanguageMenu';
import { animProps } from '@/ui/anim';

function NavLink({ label, path, active, onPress }: { label: string; path: string; active: boolean; onPress: (p: string) => void }) {
  return (
    <Pressable
      onPress={() => onPress(path)}
      style={({ hovered }: { hovered?: boolean }) => ({
        paddingVertical: 6,
        paddingHorizontal: tokens.spacing.sm,
        borderRadius: tokens.radius.sm,
        backgroundColor: hovered && !active ? tokens.colors.gray50 : 'transparent',
      })}
    >
      <AppText variant="small" weight={active ? 'semibold' : 'regular'} color={active ? tokens.colors.text : tokens.colors.gray700}>
        {label}
      </AppText>
    </Pressable>
  );
}

// one shared top bar for the whole site: wordmark, section nav on desktop,
// language switcher and the auth entry point
export function WebHeader() {
  const { t } = useI18n();
  const { me } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = width >= tokens.breakpointDesktop;

  const go = (path: string) => router.push(path as never);

  return (
    <View style={{ borderBottomWidth: tokens.border, borderBottomColor: tokens.colors.text, backgroundColor: tokens.colors.bg }}>
      <View
        style={{
          width: '100%',
          maxWidth: tokens.maxContentWide,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: tokens.spacing.lg,
          height: 58,
          gap: tokens.spacing.md,
        }}
      >
        <Pressable
          onPress={() => go('/')}
          {...animProps}
          style={({ hovered }: { hovered?: boolean }) => ({
            backgroundColor: tokens.colors.text,
            paddingVertical: 5,
            paddingHorizontal: tokens.spacing.md,
            ...(hovered ? { transform: [{ rotate: '-2deg' }] } : {}),
          })}
        >
          <AppText variant="h3" color={tokens.colors.white} style={{ letterSpacing: 1, fontFamily: tokens.logoFontFamily }}>
            rentqil
            <AppText variant="h3" color={tokens.colors.accent} style={{ letterSpacing: 1, fontFamily: tokens.logoFontFamily }}>
              !
            </AppText>
          </AppText>
        </Pressable>

        {desktop ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs, marginLeft: tokens.spacing.lg }}>
            <NavLink label={t('nav.catalog')} path="/" active={pathname === '/'} onPress={go} />
            {me ? (
              <NavLink label={t('nav.bookings')} path="/bookings" active={pathname.startsWith('/bookings')} onPress={go} />
            ) : null}
            {me && (me.role === 'owner' || me.role === 'admin') ? (
              <NavLink label={t('owner.title')} path="/owner" active={pathname.startsWith('/owner')} onPress={go} />
            ) : null}
            {me?.role === 'admin' ? (
              <NavLink label={t('nav.admin')} path="/admin" active={pathname.startsWith('/admin')} onPress={go} />
            ) : null}
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <LanguageMenu />

        {me ? (
          <>
            <Pressable onPress={() => go('/notifications')} hitSlop={tokens.hitSlop}>
              <Bell size={19} color={tokens.colors.gray700} strokeWidth={1.6} />
            </Pressable>
            {desktop ? (
              <Pressable
                onPress={() => go('/profile')}
                style={({ hovered }: { hovered?: boolean }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: tokens.border,
                  borderColor: tokens.colors.text,
                  backgroundColor: hovered ? tokens.colors.gray50 : tokens.colors.white,
                  paddingVertical: 5,
                  paddingHorizontal: tokens.spacing.md,
                })}
              >
                {me.role === 'admin' ? (
                  <ShieldCheck size={14} color={tokens.colors.gray700} strokeWidth={1.6} />
                ) : me.role === 'owner' ? (
                  <LayoutDashboard size={14} color={tokens.colors.gray700} strokeWidth={1.6} />
                ) : (
                  <User size={14} color={tokens.colors.gray700} strokeWidth={1.6} />
                )}
                <AppText variant="small" weight="medium">
                  {me.name || me.email || me.phone}
                </AppText>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Button title={t('auth.cta')} small variant="secondary" onPress={() => go('/login')} />
        )}
      </View>
    </View>
  );
}
