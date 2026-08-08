import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { tokens } from '@rentqil/shared';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import { WebStyles } from '@/components/WebStyles';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = "rentqil! - sport maydonlarini bron qilish | аренда спортивных площадок в Узбекистане";

    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(font);

    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.href = '/favicon.svg';
    document.head.appendChild(icon);

    const metas: [string, string][] = [
      [
        'description',
        "Sport maydonlarini onlayn bron qilish: futbol, tennis, padel, basketbol, voleybol. " +
          "Онлайн-бронирование спортивных площадок по всему Узбекистану: футбольные поля, теннисные корты, залы. " +
          'Book football pitches, tennis courts and sports halls across Uzbekistan.',
      ],
      [
        'keywords',
        "futbol maydoni ijarasi, sport maydonlari Toshkent, tennis kort ijara, sport zali bron qilish, futbol maydon bron, " +
          'аренда футбольного поля Ташкент, аренда спортивной площадки Узбекистан, теннисный корт аренда, снять футбольное поле, ' +
          'бронирование спортзала, падел корт Ташкент, волейбольный зал аренда, ' +
          'football field rent Tashkent, book sports venue Uzbekistan, padel court Tashkent, tennis court booking Uzbekistan',
      ],
    ];
    for (const [name, content] of metas) {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
    }
    document.body.style.backgroundColor = tokens.colors.bg;
  }, []);

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <WebStyles />
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: tokens.colors.bg },
            }}
          />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
