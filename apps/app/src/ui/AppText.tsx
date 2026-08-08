import React from 'react';
import { Platform, Text, type TextProps, type TextStyle } from 'react-native';
import { tokens } from '@rentqil/shared';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  weight?: keyof typeof tokens.fontWeight;
  center?: boolean;
}

const sizes: Record<Variant, number> = {
  h1: tokens.fontSize.h1,
  h2: tokens.fontSize.h2,
  h3: tokens.fontSize.h3,
  body: tokens.fontSize.body,
  small: tokens.fontSize.small,
  tiny: tokens.fontSize.tiny,
};

const defaultWeights: Record<Variant, TextStyle['fontWeight']> = {
  h1: '700',
  h2: '700',
  h3: '600',
  body: '400',
  small: '400',
  tiny: '400',
};

export function AppText({ variant = 'body', color, weight, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: sizes[variant],
          fontWeight: weight ? tokens.fontWeight[weight] : defaultWeights[variant],
          color: color ?? tokens.colors.text,
          ...(Platform.OS === 'web' ? { fontFamily: tokens.fontFamily } : {}),
          ...(center ? { textAlign: 'center' as const } : {}),
        },
        style,
      ]}
    />
  );
}
