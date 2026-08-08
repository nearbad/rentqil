import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { DayAvailabilityView, SlotView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { moneyShort } from '@/lib/format';
import { AppText } from '@/ui/AppText';

interface Props {
  days: DayAvailabilityView[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedHours: number[];
  onToggleHour: (hour: number) => void;
}

const CELL_W = 86;
const LABEL_W = 96;

function cellColors(slot: SlotView, selected: boolean) {
  if (selected) return { bg: tokens.colors.text, fg: tokens.colors.white, border: tokens.colors.text };
  switch (slot.state) {
    case 'free':
      return { bg: tokens.colors.white, fg: tokens.colors.text, border: tokens.colors.gray300 };
    case 'yours':
      return { bg: tokens.colors.successBg, fg: tokens.colors.success, border: tokens.colors.success };
    default:
      return { bg: tokens.colors.gray150, fg: tokens.colors.gray500, border: tokens.colors.gray150 };
  }
}

// week grid: days are columns, hour intervals are rows, so every time
// lines up under its day
export function SlotCalendar({ days, selectedDate, onSelectDate, selectedHours, onToggleHour }: Props) {
  const { t, locale } = useI18n();

  // one row per hour that any day of the week sells
  const hours = useMemo(() => {
    const set = new Set<number>();
    for (const d of days) for (const s of d.slots) set.add(s.hour);
    return [...set].sort((a, b) => a - b);
  }, [days]);

  if (hours.length === 0) {
    return (
      <AppText variant="small" color={tokens.colors.gray500} style={{ paddingVertical: tokens.spacing.lg }}>
        {t('venue.noSlots')}
      </AppText>
    );
  }

  const pick = (date: string, hour: number) => {
    if (date !== selectedDate) onSelectDate(date);
    onToggleHour(hour);
  };

  const HEADER_H = 34;
  const ROW_H = 33; // cell height plus the 4px row gap, keeps both columns aligned

  return (
    <View style={{ gap: tokens.spacing.md }}>
      <View style={{ flexDirection: 'row' }}>
        {/* the hour column stays put while a month of days scrolls next to it */}
        <View style={{ width: LABEL_W }}>
          <View style={{ height: HEADER_H }} />
          {hours.map((hour) => (
            <View key={hour} style={{ height: ROW_H, justifyContent: 'center' }}>
              <AppText variant="tiny" weight="semibold">
                {String(hour).padStart(2, '0')}:00 - {String(hour + 1).padStart(2, '0')}:00
              </AppText>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
          <View style={{ paddingBottom: tokens.spacing.sm }}>
            {/* header row: weekday and date over each column */}
            <View style={{ flexDirection: 'row', height: HEADER_H }}>
              {days.map((d) => {
                const dayIndex = new Date(`${d.date}T00:00:00`).getDay();
                return (
                  <View key={d.date} style={{ width: CELL_W, alignItems: 'center' }}>
                    <AppText variant="tiny" weight="bold" style={{ textTransform: 'uppercase' }}>
                      {t(`day.${dayIndex}` as never)}
                    </AppText>
                    <AppText variant="tiny" color={tokens.colors.gray500}>
                      {d.date.slice(5).split('-').reverse().join('.')}
                    </AppText>
                  </View>
                );
              })}
            </View>

            {hours.map((hour) => (
              <View key={hour} style={{ flexDirection: 'row', height: ROW_H }}>
                {days.map((d) => {
                const slot = d.slots.find((s) => s.hour === hour);
                if (!slot) {
                  // outside working hours or already in the past
                  return <View key={d.date} style={{ width: CELL_W }} />;
                }
                const selected = d.date === selectedDate && selectedHours.includes(slot.hour);
                const palette = cellColors(slot, selected);
                const disabled = slot.state !== 'free';
                return (
                  <View key={d.date} style={{ width: CELL_W, paddingHorizontal: 2, justifyContent: 'flex-start' }}>
                    <Pressable
                      disabled={disabled}
                      onPress={() => pick(d.date, hour)}
                      style={({ hovered }: { hovered?: boolean }) => ({
                        borderWidth: 1,
                        borderColor: hovered && !disabled ? tokens.colors.text : palette.border,
                        backgroundColor: palette.bg,
                        paddingVertical: 7,
                        alignItems: 'center',
                      })}
                    >
                      <AppText variant="tiny" weight="semibold" color={palette.fg}>
                        {slot.state === 'yours'
                          ? t('venue.slotYours')
                          : slot.state === 'busy'
                            ? t('venue.slotBusy')
                            : moneyShort(slot.priceTiyin, locale)}
                      </AppText>
                    </Pressable>
                  </View>
                );
              })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.lg }}>
        <LegendSwatch bg={tokens.colors.white} border={tokens.colors.text} label={t('venue.slotFree')} />
        <LegendSwatch bg={tokens.colors.gray150} border={tokens.colors.gray300} label={t('venue.slotBusy')} />
        <LegendSwatch bg={tokens.colors.success} border={tokens.colors.success} label={t('venue.slotYours')} />
      </View>
    </View>
  );
}

function LegendSwatch({ bg, border, label }: { bg: string; border: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
      <View style={{ width: 14, height: 14, backgroundColor: bg, borderWidth: 2, borderColor: border }} />
      <AppText variant="tiny" color={tokens.colors.gray700}>
        {label}
      </AppText>
    </View>
  );
}
