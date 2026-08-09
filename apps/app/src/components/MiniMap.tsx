import React from 'react';
import { Linking, Platform, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';

// no embedded map on a phone, the system maps app does it better and needs
// no api key. the web twin of this file draws a real tile map.
export function MiniMap({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const { t } = useI18n();

  const open = () => {
    const label = encodeURIComponent(address);
    const url =
      Platform.OS === 'ios'
        ? `maps://?ll=${lat},${lng}&q=${label}`
        : `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    Linking.openURL(url).catch(() => {
      void Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    });
  };

  return (
    <View
      style={{
        borderWidth: tokens.border,
        borderColor: tokens.colors.text,
        padding: tokens.spacing.md,
        gap: tokens.spacing.sm,
        backgroundColor: tokens.colors.white,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.sm }}>
        <MapPin size={18} color={tokens.colors.text} strokeWidth={1.6} />
        <AppText variant="small" style={{ flex: 1 }}>
          {address}
        </AppText>
      </View>
      <Button title={t('venue.openInMaps')} variant="secondary" small onPress={open} />
    </View>
  );
}
