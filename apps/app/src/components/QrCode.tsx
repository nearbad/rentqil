import React, { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { create } from 'qrcode/lib/core/qrcode.js';
import { tokens } from '@rentqil/shared';

// native draws the matrix itself with svg. the web twin of this file renders
// the same code as a data url image.

const QUIET_ZONE = 1;

export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const matrix = useMemo(() => {
    try {
      const qr = create(value, { errorCorrectionLevel: 'M' });
      const side = qr.modules.size;
      const cells = qr.modules.data;
      let path = '';
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          if (cells[y * side + x]) path += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`;
        }
      }
      return { path, total: side + QUIET_ZONE * 2 };
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) return null;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${matrix.total} ${matrix.total}`}
      style={{ alignSelf: 'center' }}
    >
      <Rect width={matrix.total} height={matrix.total} fill={tokens.colors.white} />
      <Path d={matrix.path} fill={tokens.colors.text} />
    </Svg>
  );
}
