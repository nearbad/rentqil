import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { MeView, PlatformConfigView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { api, ApiError, getApiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Divider, ErrorBox } from '@/ui/bits';

export default function LoginScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { setSession, loginWithToken } = useAuth();
  const params = useLocalSearchParams<{ next?: string; token?: string; error?: string }>();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const done = () => {
    if (params.next) {
      router.replace(params.next as never);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // the google callback lands here with ?token=
  useEffect(() => {
    if (!params.token) return;
    loginWithToken(params.token)
      .then(done)
      .catch(() => setError(t('error.UNKNOWN')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token]);

  useEffect(() => {
    if (params.error) setError(t('error.UNKNOWN'));
  }, [params.error, t]);

  useEffect(() => {
    api<PlatformConfigView>('/config')
      .then((c) => setGoogleEnabled(c.googleAuthEnabled))
      .catch(() => {});
  }, []);

  const cleanEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ ok: boolean; devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { email: cleanEmail },
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
        body: { email: cleanEmail, code: code.trim() },
      });
      await setSession(res.token, res.me);
      done();
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = () => {
    // full page redirect, the api sends us back with ?token=
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = `${getApiUrl()}/auth/google`;
    }
  };

  return (
    <Screen title={t('auth.title')} back>
      <View style={{ gap: tokens.spacing.lg, paddingTop: tokens.spacing.xl }}>
        {error ? <ErrorBox message={error} /> : null}

        {step === 'email' ? (
          <>
            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailHint')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />
            <Button title={t('auth.sendCode')} onPress={requestCode} loading={busy} disabled={!emailValid} />
            {googleEnabled ? (
              <>
                <Divider />
                <Button title={t('auth.google')} variant="secondary" onPress={googleLogin} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <AppText variant="small" color={tokens.colors.gray500}>
              {t('auth.codeSent')}: {cleanEmail}
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
