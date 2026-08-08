import React, { useState } from 'react';
import { View } from 'react-native';
import type { OwnerVenueView } from '@rentqil/shared';
import { AMENITIES, DISTRICTS, tokens, type Amenity, type District } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Chip, ErrorBox } from '@/ui/bits';
import { Select } from '@/ui/Select';

interface Props {
  initial?: OwnerVenueView;
  depositBounds?: { min: number; max: number };
  onSaved: (venue: OwnerVenueView) => void;
}

export function VenueForm({ initial, depositBounds, onSaved }: Props) {
  const { t } = useI18n();

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [district, setDistrict] = useState<District>(initial?.district ?? 'chilanzar');
  const [lat, setLat] = useState(initial ? String(initial.lat) : '41.31');
  const [lng, setLng] = useState(initial ? String(initial.lng) : '69.25');
  const [photos, setPhotos] = useState(initial?.photos.join('\n') ?? '');
  const [amenities, setAmenities] = useState<Amenity[]>(initial?.amenities ?? []);
  const [deposit, setDeposit] = useState(initial ? String(initial.depositPercent) : '30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleAmenity = (a: Amenity) =>
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        district,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        photos: photos
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean),
        amenities,
        depositPercent: parseInt(deposit, 10) || undefined,
      };
      const venue = initial
        ? await api<OwnerVenueView>(`/owner/venues/${initial.id}`, { method: 'PATCH', body })
        : await api<OwnerVenueView>('/owner/venues', { method: 'POST', body });
      onSaved(venue);
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: tokens.spacing.lg }}>
      {error ? <ErrorBox message={error} /> : null}
      <Input label={t('owner.venueName')} value={name} onChangeText={setName} />
      <Input
        label={t('owner.venueDescription')}
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ minHeight: 80 }}
      />
      <Input label={t('owner.venueAddress')} value={address} onChangeText={setAddress} />
      <Select
        label={t('owner.venueDistrict')}
        value={district}
        onChange={(v) => setDistrict(v as District)}
        options={DISTRICTS.map((d) => ({ value: d, label: t(`district.${d}`) }))}
      />
      <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Input label={`${t('owner.coordinates')} lat`} value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="lng" value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      <Input
        label={t('owner.photos')}
        value={photos}
        onChangeText={setPhotos}
        multiline
        style={{ minHeight: 70 }}
        autoCapitalize="none"
      />
      <View style={{ gap: tokens.spacing.sm }}>
        <AppText variant="small" color={tokens.colors.gray500}>
          {t('venue.amenities')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
          {AMENITIES.map((a) => (
            <Chip key={a} label={t(`amenity.${a}`)} selected={amenities.includes(a)} onPress={() => toggleAmenity(a)} />
          ))}
        </View>
      </View>
      <View style={{ gap: tokens.spacing.xs }}>
        <Input
          label={t('owner.depositPercent')}
          value={deposit}
          onChangeText={setDeposit}
          keyboardType="number-pad"
          maxLength={3}
        />
        {depositBounds ? (
          <AppText variant="tiny" color={tokens.colors.gray500}>
            {t('owner.depositRange', { min: depositBounds.min, max: depositBounds.max })}
          </AppText>
        ) : null}
      </View>
      <Button title={t('owner.sendToModeration')} onPress={submit} loading={busy} />
    </View>
  );
}
