import React from 'react';
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { CalendarDays, Search, User } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';

export default function TabsLayout() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
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
        },
        tabBarLabelStyle: { fontSize: tokens.fontSize.tiny },
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
