import React from 'react';
import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, small, style }: Props) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  const background = isPrimary ? tokens.colors.text : tokens.colors.white;
  const borderColor = isDanger ? tokens.colors.danger : tokens.colors.text;
  const textColor = isPrimary ? tokens.colors.white : isDanger ? tokens.colors.danger : tokens.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderWidth: variant === 'ghost' ? 0 : 1,
          borderColor,
          borderRadius: tokens.radius.sm,
          paddingVertical: small ? tokens.spacing.sm : 14,
          paddingHorizontal: small ? tokens.spacing.md : tokens.spacing.xl,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || loading ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <AppText variant={small ? 'small' : 'body'} weight="semibold" color={textColor}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}
