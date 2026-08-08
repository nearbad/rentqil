import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';
import { MenuItem, Popover } from './Popover';

export interface SelectOption<T extends string | number | null> {
  value: T;
  label: string;
}

interface Props<T extends string | number | null> {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  compact?: boolean;
  style?: ViewStyle;
}

// dropdown next to the trigger on desktop, bottom sheet on phones
export function Select<T extends string | number | null>({
  label,
  value,
  options,
  onChange,
  placeholder,
  compact,
  style,
}: Props<T>) {
  const current = options.find((o) => o.value === value);

  return (
    <View style={[{ gap: tokens.spacing.xs }, style]}>
      {label ? (
        <AppText variant="small" color={tokens.colors.gray500}>
          {label}
        </AppText>
      ) : null}
      <Popover
        renderTrigger={(open) => (
          <Pressable
            onPress={open}
            style={({ hovered }: { hovered?: boolean }) => ({
              borderWidth: 1,
              borderColor: hovered ? tokens.colors.gray300 : tokens.colors.gray150,
              borderRadius: tokens.radius.sm,
              paddingVertical: compact ? 8 : 12,
              paddingHorizontal: tokens.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: tokens.spacing.sm,
              backgroundColor: tokens.colors.white,
            })}
          >
            <AppText
              variant={compact ? 'small' : 'body'}
              color={current ? tokens.colors.text : tokens.colors.gray300}
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {current ? current.label : (placeholder ?? '')}
            </AppText>
            <ChevronDown size={16} color={tokens.colors.gray500} strokeWidth={1.6} />
          </Pressable>
        )}
      >
        {(close) => (
          <>
            {options.map((option, i) => (
              <MenuItem
                key={`${String(option.value)}-${i}`}
                label={option.label}
                selected={option.value === value}
                icon={
                  option.value === value ? (
                    <Check size={16} color={tokens.colors.text} strokeWidth={2} />
                  ) : (
                    <View style={{ width: 16 }} />
                  )
                }
                onPress={() => {
                  onChange(option.value);
                  close();
                }}
              />
            ))}
          </>
        )}
      </Popover>
    </View>
  );
}
