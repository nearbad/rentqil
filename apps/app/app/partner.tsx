import React, { useState } from 'react';
import { View } from 'react-native';
import { tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Card, ErrorBox } from '@/ui/bits';
import { Input } from '@/ui/Input';

// public partner request form, no account needed.
// one contact field takes either an email or a telegram handle
const CONTACT_RE = /^(\S+@\S+\.\S+|@?[a-zA-Z0-9_]{4,32})$/;

export default function PartnerScreen() {
  const { t } = useI18n();
  const { me, refresh } = useAuth();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [inn, setInn] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const contactValid = CONTACT_RE.test(contact.trim());
  const canSubmit = name.trim().length >= 2 && contactValid;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await api('/partner/apply', {
        method: 'POST',
        body: {
          name: name.trim(),
          contact: contact.trim(),
          inn: inn.trim() || undefined,
          message: message.trim() || undefined,
        },
      });
      // a signed in user also files the account application, so the admin
      // can grant the owner role right from the applications queue
      if (me && me.role === 'user') {
        const summary = [message.trim(), `contact: ${contact.trim()}`, inn.trim() ? `INN: ${inn.trim()}` : '']
          .filter(Boolean)
          .join(' | ')
          .slice(0, 500);
        await api('/owner/apply', { method: 'POST', body: { message: summary } }).catch(() => {});
        await refresh();
      }
      setSent(true);
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen title={t('partner.title')} back>
        <Card style={{ gap: tokens.spacing.sm }}>
          <AppText variant="h3">{t('partner.sent')}</AppText>
          <AppText color={tokens.colors.gray700}>{t('partner.sentText')}</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title={t('partner.title')} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <AppText color={tokens.colors.gray700} style={{ lineHeight: 22 }}>
          {t('partner.subtitle')}
        </AppText>
        {error ? <ErrorBox message={error} /> : null}

        <Input label={`${t('partner.name')} *`} value={name} onChangeText={setName} />
        <View style={{ gap: tokens.spacing.xs }}>
          <Input
            label={`${t('partner.contact')} *`}
            value={contact}
            onChangeText={setContact}
            placeholder={t('partner.contactHint')}
            autoCapitalize="none"
          />
          {contact.trim() && !contactValid ? (
            <AppText variant="tiny" color={tokens.colors.danger}>
              {t('partner.contactRequired')}
            </AppText>
          ) : null}
        </View>
        <Input
          label={t('partner.inn')}
          value={inn}
          onChangeText={setInn}
          keyboardType="number-pad"
          maxLength={14}
        />
        <Input
          label={t('partner.message')}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />

        <Button title={t('partner.submit')} onPress={submit} loading={busy} disabled={!canSubmit} />
      </View>
    </Screen>
  );
}
