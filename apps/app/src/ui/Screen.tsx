import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';
import { AppBar } from '@/components/AppBar';
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
  // the site footer only shows on the landing pages that opt in
  siteFooter?: boolean;
}

const phone = Platform.OS !== 'web';

// every page renders inside this: app bar, centered column, optional title row
export function Screen({ title, back, right, children, scroll = true, padded = true, footer, contentStyle, wide, siteFooter }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= tokens.breakpointDesktop;
  const maxWidth = wide ? tokens.maxContentWide : tokens.maxContentWidth;

  // on a phone the bar already carries the back arrow and the title, a second
  // title row underneath would be website chrome, not an app
  const titleInBar = phone && Boolean(back);
  const showTitleRow = !titleInBar && title !== undefined && (title !== '' || back);

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

  const content = scroll ? (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      {body}
      {siteFooter && !phone ? <SiteFooter /> : null}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{body}</View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.bg, paddingTop: insets.top }}>
      <AppBar title={title} back={back} right={titleInBar ? right : undefined} />
      {showTitleRow ? (
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
      {phone ? (
        // forms live inside the scroll view, the keyboard has to push them up
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
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
