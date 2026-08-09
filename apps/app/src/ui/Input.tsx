import React from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';
import { textFont } from './typography';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function Input({ label, error, style, ...rest }: Props) {
  return (
    <View style={{ gap: tokens.spacing.xs }}>
      {label ? (
        <AppText variant="small" color={tokens.colors.gray500}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={tokens.colors.gray300}
        {...rest}
        style={[
          {
            borderWidth: tokens.border,
            borderColor: error ? tokens.colors.danger : tokens.colors.text,
            borderRadius: tokens.radius.sm,
            paddingVertical: 12,
            paddingHorizontal: tokens.spacing.md,
            fontSize: tokens.fontSize.body,
            color: tokens.colors.text,
            backgroundColor: tokens.colors.white,
            ...textFont(),
            ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : {}),
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="small" color={tokens.colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
