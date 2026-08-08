import React from 'react';
import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';

// native placeholder, owners pick coordinates on the web for now
export function MapPicker(_props: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number, address?: string) => void;
}) {
  return (
    <View
      style={{
        height: 60,
        borderWidth: 1,
        borderColor: tokens.colors.gray150,
        borderRadius: tokens.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MapPin size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
    </View>
  );
}
