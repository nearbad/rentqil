import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import QRCodeLib from 'qrcode';

export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCodeLib.toDataURL(value, { margin: 1, width: size, color: { dark: '#0A0A0A', light: '#FFFFFF' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [value, size]);

  if (!dataUrl) return null;
  return <Image source={{ uri: dataUrl }} style={{ width: size, height: size, alignSelf: 'center' }} />;
}
