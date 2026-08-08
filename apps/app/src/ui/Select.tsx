import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { tokens } from '@rentqil/shared';
import { AppText } from './AppText';

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
}

// dropdowns via a plain modal sheet, works the same on web and native
export function Select<T extends string | number | null>({ label, value, options, onChange, placeholder }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={{ gap: tokens.spacing.xs }}>
      {label ? (
        <AppText variant="small" color={tokens.colors.gray500}>
          {label}
        </AppText>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: tokens.colors.gray150,
          borderRadius: tokens.radius.sm,
          paddingVertical: 12,
          paddingHorizontal: tokens.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: tokens.colors.white,
        }}
      >
        <AppText color={current ? tokens.colors.text : tokens.colors.gray300}>
          {current ? current.label : (placeholder ?? '')}
        </AppText>
        <ChevronDown size={18} color={tokens.colors.gray500} strokeWidth={1.6} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(10,10,10,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: tokens.colors.white,
              borderTopLeftRadius: tokens.radius.lg,
              borderTopRightRadius: tokens.radius.lg,
              maxHeight: '70%',
              width: '100%',
              maxWidth: tokens.maxContentWidth,
              alignSelf: 'center',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView contentContainerStyle={{ padding: tokens.spacing.sm }}>
              {options.map((option, i) => (
                <Pressable
                  key={`${String(option.value)}-${i}`}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: tokens.spacing.lg,
                    borderRadius: tokens.radius.sm,
                    backgroundColor: option.value === value ? tokens.colors.gray50 : tokens.colors.white,
                  }}
                >
                  <AppText>{option.label}</AppText>
                  {option.value === value ? <Check size={18} color={tokens.colors.text} strokeWidth={2} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
