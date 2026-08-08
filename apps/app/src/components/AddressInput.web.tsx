import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { loadYmaps, YANDEX_MAPS_KEY, YANDEX_SUGGEST_KEY } from '@/lib/ymaps.web';
import { AppText } from '@/ui/AppText';
import { Input } from '@/ui/Input';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  regionLabel?: string;
  onPickCoords?: (lat: number, lng: number) => void;
}

interface SuggestResponse {
  results?: {
    title: { text: string };
    subtitle?: { text: string };
    address?: { formatted_address: string };
  }[];
}

// address field with live suggestions from the yandex geosuggest api,
// falls back to ymaps.suggest, then to a plain input without keys
export function AddressInput({ label, value, onChangeText, regionLabel, onPickCoords }: Props) {
  const { locale } = useI18n();
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // suggestions triggered by typing only, not by programmatic updates
  const typedRef = useRef(false);

  useEffect(() => {
    if ((!YANDEX_SUGGEST_KEY && !YANDEX_MAPS_KEY) || !typedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const prefix = regionLabel ? `${regionLabel}, ` : '';
      const query = `O'zbekiston, ${prefix}${value.trim()}`;
      try {
        let found: string[] = [];
        if (YANDEX_SUGGEST_KEY) {
          const url =
            'https://suggest-maps.yandex.ru/v1/suggest' +
            `?apikey=${encodeURIComponent(YANDEX_SUGGEST_KEY)}` +
            `&text=${encodeURIComponent(query)}` +
            `&lang=${locale === 'en' ? 'en' : 'ru'}&results=5&print_address=1`;
          const res = await fetch(url);
          if (res.ok) {
            const json = (await res.json()) as SuggestResponse;
            found = (json.results ?? []).map(
              (r) => r.address?.formatted_address ?? [r.title.text, r.subtitle?.text].filter(Boolean).join(', ')
            );
          }
        } else {
          const ymaps = await loadYmaps(locale);
          if (ymaps) found = (await ymaps.suggest(query, { results: 5 })).map((s) => s.value);
        }
        setOptions(found);
        setOpen(found.length > 0);
      } catch {
        setOptions([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, regionLabel, locale]);

  const pick = async (address: string) => {
    typedRef.current = false;
    onChangeText(address);
    setOpen(false);
    if (!onPickCoords || !YANDEX_MAPS_KEY) return;
    const ymaps = await loadYmaps(locale);
    if (!ymaps) return;
    try {
      const res = await ymaps.geocode(address, { results: 1 });
      const coords = res.geoObjects.get(0)?.geometry.getCoordinates();
      if (coords) onPickCoords(Number(coords[0].toFixed(6)), Number(coords[1].toFixed(6)));
    } catch {
      // the pin simply stays where it was
    }
  };

  return (
    <View style={{ zIndex: 10 }}>
      <Input
        label={label}
        value={value}
        onChangeText={(text) => {
          typedRef.current = true;
          onChangeText(text);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open ? (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 2,
            backgroundColor: tokens.colors.white,
            borderWidth: tokens.border,
            borderColor: tokens.colors.text,
            zIndex: 20,
          }}
        >
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => pick(option)}
              style={({ hovered }: { hovered?: boolean }) => ({
                paddingVertical: 10,
                paddingHorizontal: tokens.spacing.md,
                backgroundColor: hovered ? tokens.colors.gray50 : tokens.colors.white,
              })}
            >
              <AppText variant="small">{option}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
