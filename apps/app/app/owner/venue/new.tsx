import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { OwnerVenueView } from '@rentqil/shared';
import { somToTiyin, tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Card, ErrorBox } from '@/ui/bits';
import { Toggle } from '@/ui/Toggle';
import { VenueForm } from '@/components/owner/VenueForm';

// creating a field walks through everything a bookable listing needs:
// the field itself, the cancellation policy, the prices, then moderation
export default function NewVenueScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { ready } = useRequireRole('owner', 'admin');

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);

  const [refundEnabled, setRefundEnabled] = useState(true);
  const [freeHours, setFreeHours] = useState('12');
  const [latePercent, setLatePercent] = useState('50');

  const [baseSom, setBaseSom] = useState('');
  const [eveningSom, setEveningSom] = useState('');
  const [weekendSom, setWeekendSom] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <Screen title={t('owner.newVenue')} back>{null}</Screen>;

  const basePrice = parseInt(baseSom.replace(/\D/g, ''), 10) || 0;
  const eveningPrice = parseInt(eveningSom.replace(/\D/g, ''), 10) || 0;
  const weekendPrice = parseInt(weekendSom.replace(/\D/g, ''), 10) || 0;

  const submit = async () => {
    if (!draft || basePrice <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const venue = await api<OwnerVenueView>('/owner/venues', {
        method: 'POST',
        body: {
          ...draft,
          policy: {
            refundEnabled,
            freeCancelHours: parseInt(freeHours, 10) || 0,
            lateRefundPercent: parseInt(latePercent, 10) || 0,
          },
          priceTiyin: somToTiyin(basePrice),
          ...(eveningPrice > 0 ? { eveningPriceTiyin: somToTiyin(eveningPrice) } : {}),
          ...(weekendPrice > 0 ? { weekendPriceTiyin: somToTiyin(weekendPrice) } : {}),
        },
      });
      router.replace(`/owner/venue/${venue.id}`);
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
      setBusy(false);
    }
  };

  return (
    <Screen title={t('owner.newVenue')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
          {[t('owner.stepBasics'), t('owner.stepPolicy'), t('owner.stepPrices')].map((label, i) => (
            <View
              key={label}
              style={{
                flex: 1,
                paddingVertical: 6,
                alignItems: 'center',
                backgroundColor: step === i + 1 ? tokens.colors.text : tokens.colors.white,
                borderWidth: tokens.border,
                borderColor: step > i ? tokens.colors.text : tokens.colors.gray300,
              }}
            >
              <AppText
                variant="tiny"
                weight="bold"
                color={step === i + 1 ? tokens.colors.white : step > i + 1 ? tokens.colors.text : tokens.colors.gray500}
                style={{ textTransform: 'uppercase' }}
              >
                {i + 1}. {label}
              </AppText>
            </View>
          ))}
        </View>

        {step === 1 ? (
          <VenueForm
            draftLabel={t('common.next')}
            onDraft={(body) => {
              setDraft(body);
              setStep(2);
            }}
          />
        ) : null}

        {step === 2 ? (
          <Card style={{ gap: tokens.spacing.md }}>
            <AppText variant="h3">{t('owner.policy')}</AppText>
            <Toggle label={t('owner.policyRefundEnabled')} value={refundEnabled} onChange={setRefundEnabled} />
            {refundEnabled ? (
              // labels wrap to different line counts, bottom alignment keeps the boxes level
              <View style={{ flexDirection: 'row', gap: tokens.spacing.md, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t('owner.policyFreeHours')}
                    value={freeHours}
                    onChangeText={setFreeHours}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t('owner.policyLatePercent')}
                    value={latePercent}
                    onChangeText={setLatePercent}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
              <Button title={t('common.back')} variant="secondary" small onPress={() => setStep(1)} />
              <View style={{ flex: 1 }}>
                <Button title={t('common.next')} onPress={() => setStep(3)} />
              </View>
            </View>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card style={{ gap: tokens.spacing.md }}>
            <AppText variant="h3">{t('owner.stepPrices')}</AppText>
            {error ? <ErrorBox message={error} /> : null}
            <Input
              label={t('owner.basePrice')}
              value={baseSom}
              onChangeText={setBaseSom}
              keyboardType="number-pad"
              placeholder="350000"
            />
            <Input
              label={t('owner.eveningPrice')}
              value={eveningSom}
              onChangeText={setEveningSom}
              keyboardType="number-pad"
            />
            <Input
              label={t('owner.weekendPrice')}
              value={weekendSom}
              onChangeText={setWeekendSom}
              keyboardType="number-pad"
            />
            <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
              <Button title={t('common.back')} variant="secondary" small onPress={() => setStep(2)} />
              <View style={{ flex: 1 }}>
                <Button
                  title={t('owner.sendToModeration')}
                  onPress={submit}
                  loading={busy}
                  disabled={basePrice <= 0}
                />
              </View>
            </View>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
