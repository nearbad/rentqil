import React from 'react';
import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from '@/ui/AppText';

// native placeholder, the real map only ships in the web bundle for now
// swap for react-native-maps or similar when mobile builds happen
export function MiniMap({ address }: { lat: number; lng: number; address: string }) {
  return (
    <View
      style={{
        height: 100,
        borderWidth: 1,
        borderColor: tokens.colors.gray150,
        borderRadius: tokens.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: tokens.spacing.xs,
      }}
    >
      <MapPin size={20} color={tokens.colors.gray500} strokeWidth={1.6} />
      <AppText variant="small" color={tokens.colors.gray500} center>
        {address}
      </AppText>
    </View>
  );
}
