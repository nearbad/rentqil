import React from 'react';
import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: tokens.colors.gray150,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.lg,
          backgroundColor: tokens.colors.white,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  small,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        borderWidth: 1,
        borderColor: selected ? tokens.colors.text : tokens.colors.gray150,
        backgroundColor: selected ? tokens.colors.text : tokens.colors.white,
        borderRadius: 999,
        paddingVertical: small ? 4 : 7,
        paddingHorizontal: small ? tokens.spacing.sm : tokens.spacing.md,
      }}
    >
      <AppText variant={small ? 'tiny' : 'small'} color={selected ? tokens.colors.white : tokens.colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <ActivityIndicator color={tokens.colors.text} />
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, gap: tokens.spacing.sm }}>
      <AppText variant="h3" color={tokens.colors.gray500} center>
        {title}
      </AppText>
      {hint ? (
        <AppText variant="small" color={tokens.colors.gray300} center>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <View
      style={{
        backgroundColor: tokens.colors.dangerBg,
        borderRadius: tokens.radius.sm,
        padding: tokens.spacing.md,
      }}
    >
      <AppText variant="small" color={tokens.colors.danger}>
        {message}
      </AppText>
    </View>
  );
}

export function KeyValue({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.spacing.md }}>
      <AppText variant="small" color={tokens.colors.gray500} style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <AppText variant={strong ? 'body' : 'small'} weight={strong ? 'bold' : 'regular'}>
        {value}
      </AppText>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: tokens.colors.gray150, marginVertical: tokens.spacing.md }} />;
}

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'success' | 'danger' }) {
  const palette = {
    neutral: { bg: tokens.colors.gray50, fg: tokens.colors.gray700 },
    success: { bg: tokens.colors.successBg, fg: tokens.colors.success },
    danger: { bg: tokens.colors.dangerBg, fg: tokens.colors.danger },
  }[tone];
  return (
    <View
      style={{
        backgroundColor: palette.bg,
        borderRadius: tokens.radius.sm,
        paddingVertical: 3,
        paddingHorizontal: tokens.spacing.sm,
        alignSelf: 'flex-start',
      }}
    >
      <AppText variant="tiny" color={palette.fg} weight="medium">
        {text}
      </AppText>
    </View>
  );
}
