import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { SportTypeView } from '@rentqil/shared';
import { SPORT_ICONS, tokens } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { invalidateSports } from '@/lib/sports';
import { useRequireRole } from '@/lib/guards';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Badge, Card, Chip, ErrorBox, Loading } from '@/ui/bits';
import { Toggle } from '@/ui/Toggle';
import { SportIcon } from '@/components/SportIcon';

interface Draft {
  nameUz: string;
  nameRu: string;
  nameEn: string;
  icon: string;
  sortOrder: string;
  active: boolean;
}

function draftOf(s: SportTypeView): Draft {
  return {
    nameUz: s.names.uz,
    nameRu: s.names.ru,
    nameEn: s.names.en,
    icon: s.icon,
    sortOrder: String(s.sortOrder),
    active: s.active,
  };
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
      {SPORT_ICONS.map((code) => (
        <Pressable
          key={code}
          onPress={() => onChange(code)}
          style={{
            borderWidth: 1,
            borderColor: value === code ? tokens.colors.text : tokens.colors.gray150,
            backgroundColor: value === code ? tokens.colors.gray50 : tokens.colors.white,
            borderRadius: tokens.radius.sm,
            padding: tokens.spacing.sm,
          }}
        >
          <SportIcon icon={code} size={18} />
        </Pressable>
      ))}
    </View>
  );
}

function SportRow({ sport, onSaved }: { sport: SportTypeView; onSaved: () => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(draftOf(sport));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/admin/sports/${sport.id}`, {
        method: 'PATCH',
        body: {
          nameUz: draft.nameUz.trim(),
          nameRu: draft.nameRu.trim(),
          nameEn: draft.nameEn.trim(),
          icon: draft.icon,
          sortOrder: parseInt(draft.sortOrder, 10) || 0,
          active: draft.active,
        },
      });
      invalidateSports();
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: tokens.spacing.md }}>
      <Pressable
        onPress={() => {
          setDraft(draftOf(sport));
          setOpen(!open);
        }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md }}
      >
        <SportIcon icon={sport.icon} size={20} />
        <View style={{ flex: 1 }}>
          <AppText weight="medium">{sport.names[locale]}</AppText>
          <AppText variant="tiny" color={tokens.colors.gray500}>
            {sport.code} · {sport.sortOrder}
          </AppText>
        </View>
        {!sport.active ? <Badge text={t('admin.sportHidden')} /> : null}
        {open ? (
          <ChevronUp size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
        ) : (
          <ChevronDown size={18} color={tokens.colors.gray300} strokeWidth={1.6} />
        )}
      </Pressable>

      {open ? (
        <View style={{ gap: tokens.spacing.md }}>
          {error ? <ErrorBox message={error} /> : null}
          <Input label={t('admin.sportNameUz')} value={draft.nameUz} onChangeText={(v) => setDraft({ ...draft, nameUz: v })} />
          <Input label={t('admin.sportNameRu')} value={draft.nameRu} onChangeText={(v) => setDraft({ ...draft, nameRu: v })} />
          <Input label={t('admin.sportNameEn')} value={draft.nameEn} onChangeText={(v) => setDraft({ ...draft, nameEn: v })} />
          <View style={{ gap: tokens.spacing.xs }}>
            <AppText variant="small" color={tokens.colors.gray500}>
              {t('admin.sportIcon')}
            </AppText>
            <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
          </View>
          <Input
            label={t('admin.sportOrder')}
            value={draft.sortOrder}
            onChangeText={(v) => setDraft({ ...draft, sortOrder: v.replace(/\D/g, '') })}
            keyboardType="number-pad"
          />
          <Toggle label={t('admin.sportActive')} value={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} />
          <Button title={t('common.save')} onPress={save} loading={busy} small />
        </View>
      ) : null}
    </Card>
  );
}

function AddSportForm({ onAdded }: { onAdded: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [nameUz, setNameUz] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('generic');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[a-z0-9_]{2,30}$/.test(code) && nameUz.trim().length >= 2 && nameRu.trim().length >= 2 && nameEn.trim().length >= 2;

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await api('/admin/sports', {
        method: 'POST',
        body: { code, nameUz: nameUz.trim(), nameRu: nameRu.trim(), nameEn: nameEn.trim(), icon },
      });
      invalidateSports();
      setCode('');
      setNameUz('');
      setNameRu('');
      setNameEn('');
      setIcon('generic');
      onAdded();
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: tokens.spacing.md }}>
      <AppText variant="h3">{t('admin.sportAdd')}</AppText>
      {error ? <ErrorBox message={error} /> : null}
      <Input label={t('admin.sportCode')} value={code} onChangeText={(v) => setCode(v.toLowerCase())} autoCapitalize="none" />
      <Input label={t('admin.sportNameUz')} value={nameUz} onChangeText={setNameUz} />
      <Input label={t('admin.sportNameRu')} value={nameRu} onChangeText={setNameRu} />
      <Input label={t('admin.sportNameEn')} value={nameEn} onChangeText={setNameEn} />
      <View style={{ gap: tokens.spacing.xs }}>
        <AppText variant="small" color={tokens.colors.gray500}>
          {t('admin.sportIcon')}
        </AppText>
        <IconPicker value={icon} onChange={setIcon} />
      </View>
      <Button title={t('common.add')} onPress={add} loading={busy} disabled={!valid} small variant="secondary" />
    </Card>
  );
}

export default function AdminSportsScreen() {
  const { t } = useI18n();
  const { ready } = useRequireRole('admin');
  const [items, setItems] = useState<SportTypeView[] | null>(null);

  const load = () => {
    api<{ items: SportTypeView[] }>('/admin/sports').then((res) => setItems(res.items)).catch(() => setItems([]));
  };

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  if (!ready) return <Screen title={t('admin.sports')} back>{null}</Screen>;

  return (
    <Screen title={t('admin.sports')} back>
      <View style={{ gap: tokens.spacing.md }}>
        {items === null ? (
          <Loading />
        ) : (
          <>
            {items.map((s) => (
              <SportRow key={s.id} sport={s} onSaved={load} />
            ))}
            <AddSportForm onAdded={load} />
          </>
        )}
      </View>
    </Screen>
  );
}
