import { Platform, type TextStyle } from 'react-native';
import { tokens } from '@rentqil/shared';

// the web gets a css font stack plus a real font-weight. native has one ttf
// per weight, so there the family name is what carries the weight and
// fontWeight has to stay out of the style or android double bolds it.

const INTER: Record<string, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
};

export function textFont(weight?: TextStyle['fontWeight']): TextStyle {
  if (Platform.OS === 'web') return { fontFamily: tokens.fontFamily, fontWeight: weight };
  return { fontFamily: INTER[String(weight)] ?? INTER['400'] };
}

export function logoFont(weight: '700' | '800' = '700'): TextStyle {
  if (Platform.OS === 'web') return { fontFamily: tokens.logoFontFamily };
  return { fontFamily: weight === '800' ? 'Raleway_800ExtraBold' : 'Raleway_700Bold' };
}
