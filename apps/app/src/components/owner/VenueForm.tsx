import React, { useState } from 'react';
import { View } from 'react-native';
import type { OwnerVenueView, Region } from '@rentqil/shared';
import { AMENITIES, REGIONS, tokens, type Amenity } from '@rentqil/shared';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Chip, ErrorBox } from '@/ui/bits';
import { Select } from '@/ui/Select';
import { Toggle } from '@/ui/Toggle';
import { MapPicker } from '@/components/MapPicker';

interface Props {
  initial?: OwnerVenueView;
  onSaved: (venue: OwnerVenueView) => void;
}

export function VenueForm({ initial, onSaved }: Props) {
  const { t, locale } = useI18n();
  const { sports } = useSports();

  const [name, setName] = useState(initial?.name ?? '');
  const [sport, setSport] = useState('');
  const [indoor, setIndoor] = useState(false);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [region, setRegion] = useState<Region>(initial?.region ?? 'tashkent_city');
  const [district, setDistrict] = useState(initial?.district ?? '');
  const [lat, setLat] = useState(initial ? String(initial.lat) : '41.3111');
  const [lng, setLng] = useState(initial ? String(initial.lng) : '69.2797');
  const [photos, setPhotos] = useState(initial?.photos.join('\n') ?? '');
  const [amenities, setAmenities] = useState<Amenity[]>(initial?.amenities ?? []);
  const [requireNames, setRequireNames] = useState(initial?.requireNames ?? false);
  const [requireDocuments, setRequireDocuments] = useState(initial?.requireDocuments ?? false);
  const [terms, setTerms] = useState(initial?.terms ?? '');
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
        region,
        district: district.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        photos: photos
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean),
        amenities,
        requireNames,
        requireDocuments,
        terms: terms.trim(),
        // a brand new venue is one bookable field, sport spawns its court
        ...(initial ? {} : { sport: sport || (sports[0]?.code ?? ''), indoor }),
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
      {!initial ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.md, alignItems: 'flex-end' }}>
          <Select
            label={t('owner.courtSport')}
            value={sport || (sports[0]?.code ?? '')}
            onChange={(v) => setSport(v as string)}
            options={sports.map((s) => ({ value: s.code as string, label: s.names[locale] }))}
            style={{ minWidth: 200, flex: 1 }}
          />
          <Toggle label={t('owner.courtIndoor')} value={indoor} onChange={setIndoor} />
        </View>
      ) : null}
      <Input
        label={t('owner.venueDescription')}
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ minHeight: 80 }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.md }}>
        <Select
          label={t('owner.venueRegion')}
          value={region as string}
          onChange={(v) => setRegion(v as Region)}
          options={REGIONS.map((r) => ({ value: r as string, label: t(`region.${r}`) }))}
          style={{ minWidth: 200, flex: 1 }}
        />
        <View style={{ minWidth: 200, flex: 1 }}>
          <Input label={t('owner.venueDistrict')} value={district} onChangeText={setDistrict} />
        </View>
      </View>
      <Input label={t('owner.venueAddress')} value={address} onChangeText={setAddress} />
      <View style={{ gap: tokens.spacing.sm }}>
        <AppText variant="small" color={tokens.colors.gray500}>
          {t('owner.mapPick')}
        </AppText>
        <MapPicker
          lat={parseFloat(lat) || 41.3111}
          lng={parseFloat(lng) || 69.2797}
          onPick={(la, ln) => {
            setLat(String(la));
            setLng(String(ln));
          }}
        />
        <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label={`${t('owner.coordinates')} lat`} value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="lng" value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
          </View>
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
      <View style={{ gap: tokens.spacing.md }}>
        <AppText variant="small" color={tokens.colors.gray500}>
          {t('owner.conditions')}
        </AppText>
        <Toggle label={t('owner.requireNames')} value={requireNames} onChange={setRequireNames} />
        <Toggle label={t('owner.requireDocuments')} value={requireDocuments} onChange={setRequireDocuments} />
        <Input
          label={t('owner.terms')}
          value={terms}
          onChangeText={setTerms}
          multiline
          style={{ minHeight: 80 }}
          placeholder={t('owner.termsHint')}
        />
      </View>
      <Button title={t('owner.sendToModeration')} onPress={submit} loading={busy} />
    </View>
  );
}
