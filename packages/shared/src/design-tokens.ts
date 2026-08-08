// brutalist black on white: zero radius, thick borders, hard offset shadows
// keep every visual constant here, components must not invent colors

export const colors = {
  bg: '#FFFFFF',
  text: '#0A0A0A',
  // grays, dark to light
  gray700: '#404040',
  gray500: '#737373',
  gray300: '#C6C6C6',
  gray150: '#E8E8E8',
  gray50: '#F6F6F6',
  // functional, muted on purpose
  success: '#2F7D4F',
  successBg: '#EBF3EE',
  danger: '#B0392F',
  dangerBg: '#F8ECEA',
  white: '#FFFFFF',
} as const;

export const fontSize = {
  h1: 24,
  h2: 20,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// web font stack, native falls back to the system grotesque
export const fontFamily = "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// brutalism: everything is a sharp rectangle
export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
} as const;

// thick borders are the core of the style
export const border = 2;

// hard offset shadows, web only (native ignores them)
export const shadow = '4px 4px 0 0 #0A0A0A';
export const shadowSm = '3px 3px 0 0 #0A0A0A';

// forms and reading columns stay narrow, catalog style pages go wide
export const maxContentWidth = 560;
export const maxContentWide = 1160;

// above this the app behaves like a desktop site:
// top nav in the header, no bottom tab bar, multi column grids
export const breakpointDesktop = 920;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
