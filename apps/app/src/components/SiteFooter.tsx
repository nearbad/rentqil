import React from 'react';
import { Linking, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Send } from 'lucide-react-native';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';

// lucide dropped brand icons, so the camera-in-a-square glyph is ours
function InstagramGlyph({ size = 16, color = '#000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Rect x={3} y={3} width={18} height={18} rx={5} />
      <Circle cx={12} cy={12} r={4} />
      <Path d="M17.2 6.8h.01" />
    </Svg>
  );
}

const SUPPORT_EMAIL = 'support@rentqil.com';
const TELEGRAM_URL = 'https://t.me/rentqil';
const INSTAGRAM_URL = 'https://instagram.com/rentqil';

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      {({ hovered }: { hovered?: boolean }) => (
        <AppText
          variant="small"
          color={hovered ? tokens.colors.text : tokens.colors.gray500}
          style={hovered ? { textDecorationLine: 'underline' } : undefined}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

// sitewide footer: legal pages, partner entry, socials and support contact
export function SiteFooter() {
  const { t } = useI18n();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= tokens.breakpointDesktop;
  const year = new Date().getFullYear();

  const go = (path: string) => router.push(path as never);

  return (
    <View
      style={{
        borderTopWidth: tokens.border,
        borderTopColor: tokens.colors.text,
        backgroundColor: tokens.colors.bg,
        marginTop: tokens.spacing.xxl,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: tokens.maxContentWide,
          alignSelf: 'center',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.xl,
          gap: tokens.spacing.lg,
        }}
      >
        <View
          style={{
            flexDirection: desktop ? 'row' : 'column',
            justifyContent: 'space-between',
            gap: tokens.spacing.lg,
          }}
        >
          <View style={{ gap: tokens.spacing.sm }}>
            <AppText variant="h3" style={{ fontFamily: tokens.logoFontFamily }}>
              rentqil
              <AppText variant="h3" color={tokens.colors.accent} style={{ fontFamily: tokens.logoFontFamily }}>
                !
              </AppText>
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md }}>
              <Pressable
                onPress={() => Linking.openURL(TELEGRAM_URL)}
                hitSlop={6}
                accessibilityLabel="Telegram"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Send size={16} color={tokens.colors.gray700} strokeWidth={1.6} />
                <AppText variant="small" color={tokens.colors.gray700}>
                  @rentqil
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL(INSTAGRAM_URL)}
                hitSlop={6}
                accessibilityLabel="Instagram"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <InstagramGlyph size={16} color={tokens.colors.gray700} />
                <AppText variant="small" color={tokens.colors.gray700}>
                  @rentqil
                </AppText>
              </Pressable>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              hitSlop={6}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Mail size={16} color={tokens.colors.gray700} strokeWidth={1.6} />
              <AppText variant="small" color={tokens.colors.gray700}>
                {SUPPORT_EMAIL}
              </AppText>
            </Pressable>
          </View>

          <View style={{ gap: tokens.spacing.sm }}>
            <FooterLink label={t('footer.partner')} onPress={() => go('/partner')} />
            <FooterLink label={t('footer.privacy')} onPress={() => go('/legal/privacy')} />
            <FooterLink label={t('footer.terms')} onPress={() => go('/legal/terms')} />
            <FooterLink label={t('footer.offer')} onPress={() => go('/legal/offer')} />
          </View>
        </View>

        <AppText variant="tiny" color={tokens.colors.gray500}>
          © {year} rentqil. {t('footer.rights')}.
        </AppText>
      </View>
    </View>
  );
}
