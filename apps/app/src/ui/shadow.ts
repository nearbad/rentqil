import { Platform } from 'react-native';
import { tokens } from '@rentqil/shared';

// hard offset shadows only exist on the web, native silently skips them
export function hardShadow(size: 'sm' | 'md' = 'md'): Record<string, string> {
  if (Platform.OS !== 'web') return {};
  return { boxShadow: size === 'sm' ? tokens.shadowSm : tokens.shadow };
}
