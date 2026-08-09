import { tokens } from '@rentqil/shared';

// the hard offset shadow is the core of the brutalist look, so native gets it
// too: react native supports boxShadow on the new architecture
export function hardShadow(size: 'sm' | 'md' = 'md'): Record<string, string> {
  return { boxShadow: size === 'sm' ? tokens.shadowSm : tokens.shadow };
}
