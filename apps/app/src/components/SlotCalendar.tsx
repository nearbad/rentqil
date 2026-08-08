import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { DayAvailabilityView, SlotView } from '@rentqil/shared';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { money, shortDate } from '@/lib/format';
import { AppText } from '@/ui/AppText';

interface Props {
  days: DayAvailabilityView[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  selectedHours: number[];
  onToggleHour: (hour: number) => void;
}

function slotColors(slot: SlotView, selected: boolean) {
  if (selected) return { bg: tokens.colors.text, fg: tokens.colors.white, border: tokens.colors.text };
  switch (slot.state) {
    case 'free':
      return { bg: tokens.colors.white, fg: tokens.colors.text, border: tokens.colors.gray150 };
    case 'yours':
      return { bg: tokens.colors.successBg, fg: tokens.colors.success, border: tokens.colors.successBg };
    default:
      return { bg: tokens.colors.gray50, fg: tokens.colors.gray300, border: tokens.colors.gray50 };
  }
}

export function SlotCalendar({ days, selectedDate, onSelectDate, selectedHours, onToggleHour }: Props) {
  const { t, locale } = useI18n();
  const day = days.find((d) => d.date === selectedDate) ?? days[0];

  return (
    <View style={{ gap: tokens.spacing.md }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: tokens.spacing.sm }}>
        {days.map((d) => {
          const active = d.date === (day?.date ?? '');
          return (
            <Pressable
              key={d.date}
              onPress={() => onSelectDate(d.date)}
              style={{
                borderWidth: 1,
                borderColor: active ? tokens.colors.text : tokens.colors.gray150,
                backgroundColor: active ? tokens.colors.text : tokens.colors.white,
                borderRadius: tokens.radius.sm,
                paddingVertical: tokens.spacing.sm,
                paddingHorizontal: tokens.spacing.md,
                alignItems: 'center',
              }}
            >
              <AppText variant="small" weight="medium" color={active ? tokens.colors.white : tokens.colors.text}>
                {shortDate(d.date, locale)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {!day || day.slots.length === 0 ? (
        <AppText variant="small" color={tokens.colors.gray500} style={{ paddingVertical: tokens.spacing.lg }}>
          {t('venue.noSlots')}
        </AppText>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
          {day.slots.map((slot) => {
            const selected = selectedHours.includes(slot.hour);
            const palette = slotColors(slot, selected);
            const disabled = slot.state !== 'free';
            return (
              <Pressable
                key={slot.hour}
                disabled={disabled}
                onPress={() => onToggleHour(slot.hour)}
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: palette.bg,
                  borderRadius: tokens.radius.sm,
                  paddingVertical: tokens.spacing.sm,
                  paddingHorizontal: tokens.spacing.md,
                  minWidth: 92,
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <AppText variant="small" weight="semibold" color={palette.fg}>
                  {String(slot.hour).padStart(2, '0')}:00
                </AppText>
                <AppText variant="tiny" color={disabled && !selected ? tokens.colors.gray300 : palette.fg}>
                  {slot.state === 'yours' ? t('venue.slotYours') : money(slot.priceTiyin, locale)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: tokens.spacing.lg }}>
        <LegendDot color={tokens.colors.white} border={tokens.colors.gray150} label={t('venue.slotFree')} />
        <LegendDot color={tokens.colors.gray50} border={tokens.colors.gray50} label={t('venue.slotBusy')} />
        <LegendDot color={tokens.colors.successBg} border={tokens.colors.successBg} label={t('venue.slotYours')} />
      </View>
    </View>
  );
}

function LegendDot({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color, borderWidth: 1, borderColor: border }} />
      <AppText variant="tiny" color={tokens.colors.gray500}>
        {label}
      </AppText>
    </View>
  );
}
