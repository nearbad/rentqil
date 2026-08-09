import React from 'react';
import { tokens } from '@rentqil/shared';
import { AppText } from '@/ui/AppText';
import { breatheProps, pulseProps } from '@/ui/anim';
import { logoFont } from '@/ui/typography';

// the wordmark, breathing. the web drives it with css keyframes, the native
// copy of this file runs the same motion through Animated.
export function LogoMark() {
  return (
    <AppText
      variant="h3"
      color={tokens.colors.white}
      style={{ letterSpacing: 1, ...logoFont() }}
      {...breatheProps}
    >
      rentqil
      <AppText
        variant="h3"
        color={tokens.colors.accent}
        style={{ letterSpacing: 1, ...logoFont() }}
        {...pulseProps}
      >
        !
      </AppText>
    </AppText>
  );
}
