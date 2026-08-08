import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';

interface Props {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}

export function Toggle({ label, value, onChange, hint }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.md }}
    >
      <View style={{ flex: 1 }}>
        <AppText>{label}</AppText>
        {hint ? (
          <AppText variant="small" color={tokens.colors.gray500}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: tokens.colors.gray150, true: tokens.colors.text }}
        thumbColor={tokens.colors.white}
      />
    </Pressable>
  );
}
