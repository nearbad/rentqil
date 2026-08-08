import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { LEGAL_DOCS } from '@/lib/legal';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { EmptyState } from '@/ui/bits';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t } = useI18n();
  const content = doc ? LEGAL_DOCS[doc] : undefined;

  if (!content) {
    return (
      <Screen title="" back>
        <EmptyState title={t('error.NOT_FOUND')} />
      </Screen>
    );
  }

  return (
    <Screen title={t(content.titleKey)} back>
      <View style={{ gap: tokens.spacing.lg }}>
        {content.sections.map((section) => (
          <View key={section.heading} style={{ gap: tokens.spacing.xs }}>
            <AppText variant="h3">{section.heading}</AppText>
            <AppText color={tokens.colors.gray700} style={{ lineHeight: 22, textAlign: 'justify' }}>
              {section.body}
            </AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}
