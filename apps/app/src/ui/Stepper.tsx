import React from 'react';
import { Pressable, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function Stepper({ value, min, max, onChange }: Props) {
  const btn = (disabled: boolean) => ({
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: tokens.colors.gray150,
    borderRadius: tokens.radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: disabled ? 0.3 : 1,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md }}>
      <Pressable style={btn(value <= min)} disabled={value <= min} onPress={() => onChange(value - 1)}>
        <Minus size={16} color={tokens.colors.text} strokeWidth={1.6} />
      </Pressable>
      <AppText variant="h3" style={{ minWidth: 28, textAlign: 'center' }}>
        {value}
      </AppText>
      <Pressable style={btn(value >= max)} disabled={value >= max} onPress={() => onChange(value + 1)}>
        <Plus size={16} color={tokens.colors.text} strokeWidth={1.6} />
      </Pressable>
    </View>
  );
}
