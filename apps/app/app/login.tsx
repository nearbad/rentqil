import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { MeView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { ErrorBox } from '@/ui/bits';

export default function LoginScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { setSession } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+998');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ ok: boolean; devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { phone: phone.replace(/[\s-]/g, '') },
      });
      setDevCode(res.devCode ?? null);
      setStep('code');
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string; me: MeView }>('/auth/otp/verify', {
        method: 'POST',
        body: { phone: phone.replace(/[\s-]/g, ''), code: code.trim() },
      });
      await setSession(res.token, res.me);
      if (params.next) {
        router.replace(params.next as never);
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('auth.title')} back>
      <View style={{ gap: tokens.spacing.lg, paddingTop: tokens.spacing.xl }}>
        {error ? <ErrorBox message={error} /> : null}

        {step === 'phone' ? (
          <>
            <Input
              label={t('auth.phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth.phoneHint')}
              keyboardType="phone-pad"
              autoFocus
            />
            <Button title={t('auth.sendCode')} onPress={requestCode} loading={busy} />
          </>
        ) : (
          <>
            <AppText variant="small" color={tokens.colors.gray500}>
              {t('auth.codeSent')}: {phone}
            </AppText>
            {devCode ? (
              <AppText variant="small" color={tokens.colors.gray500}>
                {t('auth.devCodeNote')}: {devCode}
              </AppText>
            ) : null}
            <Input
              label={t('auth.code')}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <Button title={t('auth.verify')} onPress={verify} loading={busy} disabled={code.length !== 6} />
            <Button title={t('auth.resend')} onPress={requestCode} variant="ghost" disabled={busy} />
          </>
        )}
      </View>
    </Screen>
  );
}
