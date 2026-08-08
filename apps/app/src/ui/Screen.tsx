import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';
import { WebHeader } from '@/components/WebHeader';
import { SiteFooter } from '@/components/SiteFooter';

interface Props {
  title?: string;
  back?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  // wide pages (catalog, dashboards) get the full desktop column
  wide?: boolean;
}

// every page renders inside this: site header, centered column, optional title row
export function Screen({ title, back, right, children, scroll = true, padded = true, footer, contentStyle, wide }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= tokens.breakpointDesktop;
  const maxWidth = wide ? tokens.maxContentWide : tokens.maxContentWidth;

  const body = (
    <View
      style={[
        {
          width: '100%',
          maxWidth,
          alignSelf: 'center',
          paddingHorizontal: padded ? tokens.spacing.lg : 0,
          paddingBottom: tokens.spacing.xxl,
          flexGrow: 1,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.bg, paddingTop: insets.top }}>
      <WebHeader />
      {title !== undefined && (title !== '' || back) ? (
        <View
          style={{
            width: '100%',
            maxWidth,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: tokens.spacing.lg,
            paddingTop: desktop ? tokens.spacing.xl : tokens.spacing.md,
            paddingBottom: tokens.spacing.md,
            gap: tokens.spacing.md,
          }}
        >
          {back ? (
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={tokens.hitSlop}>
              <ArrowLeft size={22} color={tokens.colors.text} strokeWidth={1.6} />
            </Pressable>
          ) : null}
          <AppText variant={desktop ? 'h1' : 'h2'} style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </AppText>
          {right}
        </View>
      ) : null}
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {body}
          <SiteFooter />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {footer ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: tokens.colors.gray150,
            backgroundColor: tokens.colors.bg,
            paddingBottom: insets.bottom || tokens.spacing.lg,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth,
              alignSelf: 'center',
              paddingHorizontal: tokens.spacing.lg,
              paddingTop: tokens.spacing.md,
            }}
          >
            {footer}
          </View>
        </View>
      ) : null}
    </View>
  );
}
