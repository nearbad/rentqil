import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, LayoutDashboard, ShieldCheck } from 'lucide-react-native';
import type { Locale, MeView } from '@rentqil/shared';
import { LOCALES, tokens } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Card, Chip, Divider } from '@/ui/bits';

const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

function PasswordSection() {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  const save = async () => {
    if (password.length < 6) return;
    setBusy(true);
    try {
      await api('/auth/password/set', { method: 'POST', body: { password } });
      setPassword('');
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Input
        label={t('auth.setPassword')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <Button
        title={flash ? t('profile.saved') : t('common.save')}
        onPress={save}
        loading={busy}
        variant="secondary"
        small
        disabled={password.length < 6}
      />
    </View>
  );
}

function NavRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, paddingVertical: 14 }}
    >
      {icon}
      <AppText style={{ flex: 1 }}>{label}</AppText>
      <ChevronRight size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t, locale, setLocale } = useI18n();
  const { me, setSession, refresh, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(me?.name ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '+998');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');

  const changeLocale = async (next: Locale) => {
    setLocale(next);
    if (me) {
      try {
        await api<MeView>('/me', { method: 'PATCH', body: { locale: next } });
      } catch {
        // local switch already applied, server sync is best effort
      }
    }
  };

  const saveName = async () => {
    if (!me) return;
    setSaving(true);
    try {
      const cleanPhone = phone.replace(/[\s-]/g, '');
      await api<MeView>('/me', {
        method: 'PATCH',
        body: {
          name: name.trim() || undefined,
          ...(/^\+998\d{9}$/.test(cleanPhone) ? { phone: cleanPhone } : {}),
        },
      });
      await refresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  const applyOwner = async () => {
    setApplying(true);
    try {
      await api('/owner/apply', { method: 'POST', body: { message: applyMessage.trim() || undefined } });
      await refresh();
    } finally {
      setApplying(false);
    }
  };

  if (!me) {
    return (
      <Screen title={t('profile.title')}>
        <View style={{ gap: tokens.spacing.lg, paddingTop: tokens.spacing.xl }}>
          <AppText color={tokens.colors.gray500}>{t('auth.loginRequired')}</AppText>
          <Button title={t('auth.title')} onPress={() => router.push('/login')} />
          <Divider />
          <AppText variant="small" color={tokens.colors.gray500}>
            {t('profile.language')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            {LOCALES.map((l) => (
              <Chip key={l} label={LOCALE_LABELS[l]} selected={l === locale} onPress={() => changeLocale(l)} />
            ))}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('profile.title')}>
      <View style={{ gap: tokens.spacing.lg, paddingTop: tokens.spacing.md }}>
        <AppText variant="h3">{me.email ?? me.phone}</AppText>

        <View style={{ gap: tokens.spacing.sm }}>
          <Input label={t('profile.name')} value={name} onChangeText={setName} />
          <Input label={t('profile.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Button
            title={savedFlash ? t('profile.saved') : t('common.save')}
            onPress={saveName}
            loading={saving}
            variant="secondary"
            small
          />
        </View>

        <PasswordSection />

        <View style={{ gap: tokens.spacing.sm }}>
          <AppText variant="small" color={tokens.colors.gray500}>
            {t('profile.language')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
            {LOCALES.map((l) => (
              <Chip key={l} label={LOCALE_LABELS[l]} selected={l === locale} onPress={() => changeLocale(l)} />
            ))}
          </View>
        </View>

        <Divider />

        <NavRow
          icon={<Bell size={20} color={tokens.colors.text} strokeWidth={1.6} />}
          label={t('nav.notifications')}
          onPress={() => router.push('/notifications')}
        />

        {me.role === 'owner' || me.role === 'admin' ? (
          <NavRow
            icon={<LayoutDashboard size={20} color={tokens.colors.text} strokeWidth={1.6} />}
            label={t('owner.title')}
            onPress={() => router.push('/owner')}
          />
        ) : null}
        {me.role === 'admin' ? (
          <NavRow
            icon={<ShieldCheck size={20} color={tokens.colors.text} strokeWidth={1.6} />}
            label={t('admin.title')}
            onPress={() => router.push('/admin')}
          />
        ) : null}

        {me.role === 'user' ? (
          <Card style={{ gap: tokens.spacing.md }}>
            <AppText variant="h3">{t('profile.becomeOwner')}</AppText>
            {me.ownerApplicationStatus === 'pending' ? (
              <AppText variant="small" color={tokens.colors.gray500}>
                {t('profile.ownerPending')}
              </AppText>
            ) : me.ownerApplicationStatus === 'rejected' ? (
              <AppText variant="small" color={tokens.colors.danger}>
                {t('profile.ownerRejected')}
              </AppText>
            ) : (
              <>
                <AppText variant="small" color={tokens.colors.gray500}>
                  {t('profile.applyText')}
                </AppText>
                <Input
                  value={applyMessage}
                  onChangeText={setApplyMessage}
                  placeholder={t('profile.applyMessage')}
                  multiline
                />
                <Button title={t('profile.apply')} onPress={applyOwner} loading={applying} variant="secondary" />
              </>
            )}
          </Card>
        ) : null}

        <Divider />
        <Button title={t('common.logout')} onPress={logout} variant="danger" />
      </View>
    </Screen>
  );
}
