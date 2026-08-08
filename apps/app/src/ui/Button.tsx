import React from 'react';
import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';
import { hardShadow } from './shadow';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
}) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const solid = isPrimary || variant === 'secondary';

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
          borderWidth: variant === 'ghost' ? 0 : tokens.border,
          borderColor,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: small ? tokens.spacing.sm : 14,
          paddingHorizontal: small ? tokens.spacing.md : tokens.spacing.xl,
          opacity: disabled || loading ? 0.4 : 1,
          // the block visually sinks into its shadow when pressed
          ...(solid && !disabled && !loading && !pressed ? hardShadow(small ? 'sm' : 'md') : {}),
          ...(pressed && solid ? { transform: [{ translateX: 2 }, { translateY: 2 }] } : {}),
          ...(pressed && !solid ? { opacity: 0.6 } : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <AppText
          variant={small ? 'small' : 'body'}
          weight="bold"
          color={textColor}
          style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
        >
          {title}
        </AppText>
      )}
    </Pressable>
  );
}
