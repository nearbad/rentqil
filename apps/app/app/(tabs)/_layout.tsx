import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { CalendarDays, Search, User } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';

// a tab stacks 5px padding, a 28px icon box, 3px gap and a 15px label line,
// which does not fit the default 49px bar: the label box is the only part
// allowed to shrink, so it gets squashed and the text is cut in half.
// 62 leaves the whole stack room plus a few px of slack
const BAR_HEIGHT = 62;

export default function TabsLayout() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // on desktop the header nav replaces the bottom tabs
  const desktop = width >= tokens.breakpointDesktop;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.text,
        tabBarInactiveTintColor: tokens.colors.gray300,
        tabBarStyle: {
          backgroundColor: tokens.colors.bg,
          borderTopColor: tokens.colors.gray150,
          display: desktop ? 'none' : 'flex',
          // a custom height replaces the built in one, the safe area
          // padding it normally adds has to come along with it
          height: BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        // no padding here on purpose: tabBarItemStyle lands on the wrapper
        // around the tab and eats the height the label needs
        tabBarLabelStyle: { fontSize: tokens.fontSize.tiny, lineHeight: 15, marginTop: 3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.catalog'),
          tabBarIcon: ({ color }) => <Search size={22} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('nav.bookings'),
          tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={1.6} />,
        }}
      />
    </Tabs>
  );
}
