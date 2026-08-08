import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { tokens } from '@rentqil/shared';
import { useI18n } from '@/lib/i18n';
import { loadYmaps, YANDEX_MAPS_KEY } from '@/lib/ymaps.web';
import { AppText } from '@/ui/AppText';
import { Input } from '@/ui/Input';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  regionLabel?: string;
  onPickCoords?: (lat: number, lng: number) => void;
}

// address field with live yandex suggestions, falls back to a plain
// input when no maps key is baked into the bundle
export function AddressInput({ label, value, onChangeText, regionLabel, onPickCoords }: Props) {
  const { locale } = useI18n();
  const [options, setOptions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // suggestions triggered by typing only, not by programmatic updates
  const typedRef = useRef(false);

  useEffect(() => {
    if (!YANDEX_MAPS_KEY || !typedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const ymaps = await loadYmaps(locale);
      if (!ymaps) return;
      try {
        const prefix = regionLabel ? `${regionLabel}, ` : '';
        const found = await ymaps.suggest(`O'zbekiston, ${prefix}${value.trim()}`, { results: 5 });
        setOptions(found.map((s) => s.value));
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
    if (!onPickCoords) return;
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
