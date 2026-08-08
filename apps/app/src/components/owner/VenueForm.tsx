import React, { useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { OwnerVenueView, Region } from '@rentqil/shared';
import { AMENITIES, REGIONS, tokens, type Amenity } from '@rentqil/shared';
import { api, apiUpload, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useSports } from '@/lib/sports';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Chip, ErrorBox } from '@/ui/bits';
import { Select } from '@/ui/Select';
import { Toggle } from '@/ui/Toggle';
import { MapPicker } from '@/components/MapPicker';
import { AddressInput } from '@/components/AddressInput';

interface Props {
  initial?: OwnerVenueView;
  onSaved?: (venue: OwnerVenueView) => void;
  // wizard mode: collect the payload instead of posting it
  onDraft?: (body: Record<string, unknown>) => void;
  draftLabel?: string;
}

export function VenueForm({ initial, onSaved, onDraft, draftLabel }: Props) {
  const { t, locale } = useI18n();
  const { sports } = useSports();

  const [name, setName] = useState(initial?.name ?? '');
  const [sport, setSport] = useState('');
  const [indoor, setIndoor] = useState(false);
  const [openHour, setOpenHour] = useState(8);
  const [closeHour, setCloseHour] = useState(23);
  const [uploading, setUploading] = useState(false);
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

  const photoList = photos
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const removePhoto = (url: string) => setPhotos(photoList.filter((p) => p !== url).join('\n'));

  // browser file picker feeding the api upload endpoint
  const pickAndUpload = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? ([] as unknown as FileList)).slice(0, 10);
      if (files.length === 0) return;
      setUploading(true);
      setError(null);
      try {
        const urls: string[] = [];
        for (const file of files) {
          const res = await apiUpload(file, file.name);
          urls.push(res.url);
        }
        setPhotos((prev) => [...prev.split('\n').map((p) => p.trim()).filter(Boolean), ...urls].join('\n'));
      } catch (e) {
        setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const submit = async () => {
    setError(null);
    const body = buildBody();
    if (onDraft) {
      onDraft(body);
      return;
    }
    setBusy(true);
    try {
      const venue = initial
        ? await api<OwnerVenueView>(`/owner/venues/${initial.id}`, { method: 'PATCH', body })
        : await api<OwnerVenueView>('/owner/venues', { method: 'POST', body });
      onSaved?.(venue);
    } catch (e) {
      setError(t(e instanceof ApiError ? (`error.${e.code}` as never) : 'error.UNKNOWN'));
    } finally {
      setBusy(false);
    }
  };

  const buildBody = (): Record<string, unknown> => ({
    name: name.trim(),
    description: description.trim(),
    address: address.trim(),
    region,
    district: district.trim(),
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    photos: photoList,
    amenities,
    requireNames,
    requireDocuments,
    terms: terms.trim(),
    // a brand new venue is one bookable field, sport spawns its court
    ...(initial ? {} : { sport: sport || (sports[0]?.code ?? ''), indoor, openHour, closeHour }),
  });

  return (
    <View style={{ gap: tokens.spacing.lg }}>
      {error ? <ErrorBox message={error} /> : null}
      <Input label={t('owner.venueName')} value={name} onChangeText={setName} />
      {!initial ? (
        <View style={{ gap: tokens.spacing.md }}>
          <Select
            label={t('owner.courtSport')}
            value={sport || (sports[0]?.code ?? '')}
            onChange={(v) => setSport(v as string)}
            options={sports.map((s) => ({ value: s.code as string, label: s.names[locale] }))}
          />
          <View style={{ gap: tokens.spacing.xs }}>
            <AppText variant="small" color={tokens.colors.gray500}>
              {t('owner.workingHours')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: tokens.spacing.md }}>
              <Select
                compact
                value={openHour}
                onChange={(v) => {
                  const next = v as number;
                  setOpenHour(next);
                  if (closeHour <= next) setCloseHour(Math.min(next + 1, 24));
                }}
                options={Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }))}
                style={{ flex: 1 }}
              />
              <Select
                compact
                value={closeHour}
                onChange={(v) => setCloseHour(v as number)}
                options={Array.from({ length: 24 - openHour }, (_, i) => {
                  const h = openHour + 1 + i;
                  return { value: h, label: `${String(h).padStart(2, '0')}:00` };
                })}
                style={{ flex: 1 }}
              />
            </View>
          </View>
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
      <AddressInput
        label={t('owner.venueAddress')}
        value={address}
        onChangeText={setAddress}
        regionLabel={t(`region.${region}`)}
        onPickCoords={(la, ln) => {
          setLat(String(la));
          setLng(String(ln));
        }}
      />
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
      <View style={{ gap: tokens.spacing.sm }}>
        <PhotoStrip photos={photoList} onRemove={removePhoto} />
        {Platform.OS === 'web' ? (
          <Button
            title={t('owner.uploadPhotos')}
            variant="secondary"
            small
            loading={uploading}
            onPress={pickAndUpload}
          />
        ) : null}
        <Input
          label={t('owner.photos')}
          value={photos}
          onChangeText={setPhotos}
          multiline
          style={{ minHeight: 70 }}
          autoCapitalize="none"
        />
      </View>
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
      <Button title={draftLabel ?? t('owner.sendToModeration')} onPress={submit} loading={busy} />
    </View>
  );
}

function PhotoStrip({ photos, onRemove }: { photos: string[]; onRemove: (url: string) => void }) {
  if (photos.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
      {photos.map((url) => (
        <View key={url}>
          <Image
            source={{ uri: url }}
            style={{
              width: 84,
              height: 60,
              backgroundColor: tokens.colors.gray50,
              borderWidth: 1,
              borderColor: tokens.colors.gray300,
            }}
          />
          <Pressable
            onPress={() => onRemove(url)}
            hitSlop={8}
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              backgroundColor: tokens.colors.text,
              padding: 2,
            }}
          >
            <X size={12} color={tokens.colors.white} strokeWidth={2.4} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
