import React from 'react';
import { Input } from '@/ui/Input';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  // hint that narrows suggestions, e.g. the picked region name
  regionLabel?: string;
  onPickCoords?: (lat: number, lng: number) => void;
}

// native fallback: a plain input, suggestions only exist on the web
export function AddressInput({ label, value, onChangeText }: Props) {
  return <Input label={label} value={value} onChangeText={onChangeText} />;
}
