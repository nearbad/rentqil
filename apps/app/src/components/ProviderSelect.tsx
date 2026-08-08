import React from 'react';
import { Pressable, View } from 'react-native';
import { PAYMENT_PROVIDERS, tokens, type PaymentProviderId } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Badge } from '@/ui/bits';

interface Props {
  value: PaymentProviderId;
  onChange: (id: PaymentProviderId) => void;
}

export function ProviderSelect({ value, onChange }: Props) {
  const { t } = useI18n();
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      {PAYMENT_PROVIDERS.map((provider) => {
        const selected = provider.id === value;
        return (
          <Pressable
            key={provider.id}
            onPress={() => onChange(provider.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.spacing.md,
              borderWidth: 1,
              borderColor: selected ? tokens.colors.text : tokens.colors.gray150,
              borderRadius: tokens.radius.sm,
              paddingVertical: tokens.spacing.md,
              paddingHorizontal: tokens.spacing.lg,
            }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: selected ? 6 : 1.5,
                borderColor: selected ? tokens.colors.text : tokens.colors.gray300,
              }}
            />
            <AppText weight={selected ? 'semibold' : 'regular'} style={{ flex: 1 }}>
              {provider.label}
            </AppText>
            {provider.installment ? <Badge text={t('book.installment')} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
