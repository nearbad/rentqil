import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { somToTiyin, tiyinToSom, tokens, WEEK_UI_ORDER } from '@rentqil/shared';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRequireRole } from '@/lib/guards';
import { addDaysYmd, todayYmd } from '@/lib/format';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Card, Divider, Loading } from '@/ui/bits';
import { Select } from '@/ui/Select';
import { Toggle } from '@/ui/Toggle';

interface CourtData {
  id: string;
  name: string;
  sport: string;
  indoor: boolean;
  active: boolean;
  scheduleRules: { id: string; dayOfWeek: number; openHour: number; closeHour: number }[];
  priceRules: { id: string; dayOfWeek: number | null; startHour: number; endHour: number; priceTiyin: number }[];
}

interface BlockRow {
  id: string;
  date: string;
  startHour: number;
  endHour: number;
  reason: string | null;
}

const hourOptions = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: `${String(from + i).padStart(2, '0')}:00` }));

// per weekday editor state: null means closed
type WeekDraft = Record<number, { open: number; close: number } | null>;

function ScheduleEditor({ court, onSaved }: { court: CourtData; onSaved: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<WeekDraft>(() => {
    const initial: WeekDraft = {};
    for (const day of WEEK_UI_ORDER) {
      const rule = court.scheduleRules.find((r) => r.dayOfWeek === day);
      initial[day] = rule ? { open: rule.openHour, close: rule.closeHour } : null;
    }
    return initial;
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const rules = Object.entries(draft)
        .filter(([, v]) => v !== null)
        .map(([day, v]) => ({ dayOfWeek: Number(day), openHour: v!.open, closeHour: v!.close }));
      await api(`/owner/courts/${court.id}/schedule`, { method: 'PUT', body: { rules } });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: tokens.spacing.md }}>
      <AppText variant="h3">{t('owner.schedule')}</AppText>
      {WEEK_UI_ORDER.map((day) => {
        const value = draft[day] ?? null;
        return (
          <View key={day} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
            <AppText variant="small" weight="medium" style={{ width: 30 }}>
              {t(`day.${day}` as never)}
            </AppText>
            {value ? (
              <>
                <View style={{ flex: 1 }}>
                  <Select
                    value={value.open}
                    onChange={(v) => setDraft((d) => ({ ...d, [day]: { open: v as number, close: Math.max(value.close, (v as number) + 1) } }))}
                    options={hourOptions(0, 23)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Select
                    value={value.close}
                    onChange={(v) => setDraft((d) => ({ ...d, [day]: { open: value.open, close: v as number } }))}
                    options={hourOptions(value.open + 1, 24)}
                  />
                </View>
              </>
            ) : (
              <AppText variant="small" color={tokens.colors.gray300} style={{ flex: 1 }}>
                {t('owner.closed')}
              </AppText>
            )}
            <Toggle
              label=""
              value={value !== null}
              onChange={(on) => setDraft((d) => ({ ...d, [day]: on ? { open: 8, close: 22 } : null }))}
            />
          </View>
        );
      })}
      <Button title={t('common.save')} onPress={save} loading={busy} variant="secondary" small />
    </Card>
  );
}

function PricesEditor({ court, onSaved }: { court: CourtData; onSaved: () => void }) {
  const { t, locale } = useI18n();
  const [rules, setRules] = useState(court.priceRules.map((r) => ({ ...r })));
  const [day, setDay] = useState<number | null>(null);
  const [from, setFrom] = useState(8);
  const [to, setTo] = useState(22);
  const [priceSom, setPriceSom] = useState('');
  const [busy, setBusy] = useState(false);

  const dayOptions = [
    { value: null as number | null, label: t('owner.anyDay') },
    ...WEEK_UI_ORDER.map((d) => ({ value: d as number | null, label: t(`day.full.${d}` as never) })),
  ];

  const addRule = () => {
    const som = parseInt(priceSom.replace(/\D/g, ''), 10);
    if (!som || to <= from) return;
    setRules((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, dayOfWeek: day, startHour: from, endHour: to, priceTiyin: somToTiyin(som) },
    ]);
    setPriceSom('');
  };

  const save = async () => {
    setBusy(true);
    try {
      await api(`/owner/courts/${court.id}/prices`, {
        method: 'PUT',
        body: {
          rules: rules.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startHour: r.startHour,
            endHour: r.endHour,
            priceTiyin: r.priceTiyin,
          })),
        },
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: tokens.spacing.md }}>
      <AppText variant="h3">{t('owner.prices')}</AppText>
      <AppText variant="tiny" color={tokens.colors.gray500}>
        {t('owner.priceHint')}
      </AppText>

      {rules.map((rule) => (
        <View key={rule.id} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
          <AppText variant="small" style={{ flex: 1 }}>
            {rule.dayOfWeek === null ? t('owner.anyDay') : t(`day.full.${rule.dayOfWeek}` as never)} ·{' '}
            {String(rule.startHour).padStart(2, '0')}:00-{String(rule.endHour).padStart(2, '0')}:00
          </AppText>
          <AppText variant="small" weight="semibold">
            {Math.round(tiyinToSom(rule.priceTiyin)).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU')}
          </AppText>
          <Pressable onPress={() => setRules((prev) => prev.filter((r) => r.id !== rule.id))} hitSlop={tokens.hitSlop}>
            <Trash2 size={16} color={tokens.colors.danger} strokeWidth={1.6} />
          </Pressable>
        </View>
      ))}

      <Divider />
      <View style={{ gap: tokens.spacing.sm }}>
        <Select value={day} onChange={setDay} options={dayOptions} />
        <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Select value={from} onChange={(v) => setFrom(v as number)} options={hourOptions(0, 23)} />
          </View>
          <View style={{ flex: 1 }}>
            <Select value={to} onChange={(v) => setTo(v as number)} options={hourOptions(1, 24)} />
          </View>
        </View>
        <Input
          label={t('owner.priceSom')}
          value={priceSom}
          onChangeText={setPriceSom}
          keyboardType="number-pad"
          placeholder="350000"
        />
        <Button title={t('owner.addPriceRule')} onPress={addRule} variant="secondary" small />
      </View>
      <Button title={t('common.save')} onPress={save} loading={busy} small />
    </Card>
  );
}

function BlocksEditor({ courtId }: { courtId: string }) {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState<BlockRow[] | null>(null);
  const [date, setDate] = useState(todayYmd());
  const [from, setFrom] = useState(18);
  const [to, setTo] = useState(19);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    api<{ items: BlockRow[] }>(`/owner/courts/${courtId}/blocks`)
      .then((r) => setBlocks(r.items))
      .catch(() => setBlocks([]));
  }, [courtId]);

  useEffect(load, [load]);

  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = addDaysYmd(todayYmd(), i);
    return { value: d, label: i === 0 ? t('common.today') : d.slice(5).split('-').reverse().join('.') };
  });

  const add = async () => {
    setBusy(true);
    setError(false);
    try {
      await api(`/owner/courts/${courtId}/blocks`, {
        method: 'POST',
        body: { date, startHour: from, endHour: to, reason: reason.trim() || undefined },
      });
      setReason('');
      load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: tokens.spacing.md }}>
      <AppText variant="h3">{t('owner.blocks')}</AppText>

      {blocks === null ? (
        <Loading />
      ) : (
        blocks.map((b) => (
          <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
            <AppText variant="small" style={{ flex: 1 }}>
              {b.date.slice(5).split('-').reverse().join('.')} · {String(b.startHour).padStart(2, '0')}:00-
              {String(b.endHour).padStart(2, '0')}:00{b.reason ? ` · ${b.reason}` : ''}
            </AppText>
            <Pressable
              onPress={() => api(`/owner/blocks/${b.id}`, { method: 'DELETE' }).then(load)}
              hitSlop={tokens.hitSlop}
            >
              <Trash2 size={16} color={tokens.colors.danger} strokeWidth={1.6} />
            </Pressable>
          </View>
        ))
      )}

      {error ? (
        <AppText variant="small" color={tokens.colors.danger}>
          {t('error.SLOT_TAKEN')}
        </AppText>
      ) : null}

      <Divider />
      <Select value={date} onChange={(v) => setDate(v as string)} options={dateOptions} />
      <View style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Select value={from} onChange={(v) => { setFrom(v as number); if (to <= (v as number)) setTo((v as number) + 1); }} options={hourOptions(0, 23)} />
        </View>
        <View style={{ flex: 1 }}>
          <Select value={to} onChange={(v) => setTo(v as number)} options={hourOptions(from + 1, 24)} />
        </View>
      </View>
      <Input value={reason} onChangeText={setReason} placeholder={t('owner.blockReason')} />
      <Button title={t('owner.addBlock')} onPress={add} loading={busy} variant="secondary" small />
    </Card>
  );
}

export default function CourtScreen() {
  const { courtId } = useLocalSearchParams<{ courtId: string }>();
  const { t } = useI18n();
  const { ready } = useRequireRole('owner', 'admin');
  const [court, setCourt] = useState<CourtData | null>(null);
  const [active, setActive] = useState(true);

  const load = useCallback(() => {
    if (!courtId) return;
    api<CourtData>(`/owner/courts/${courtId}`).then((c) => {
      setCourt(c);
      setActive(c.active);
    });
  }, [courtId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready || !court) {
    return (
      <Screen title={t('owner.courts')} back>
        {ready ? <Loading /> : null}
      </Screen>
    );
  }

  return (
    <Screen title={court.name} back>
      <View style={{ gap: tokens.spacing.lg }}>
        <Toggle
          label={t('owner.courtActive')}
          value={active}
          onChange={async (v) => {
            setActive(v);
            await api(`/owner/courts/${court.id}`, { method: 'PATCH', body: { active: v } });
          }}
        />
        <ScheduleEditor court={court} onSaved={load} />
        <PricesEditor court={court} onSaved={load} />
        <BlocksEditor courtId={court.id} />
      </View>
    </Screen>
  );
}
