/**
 * Dark, calm palette — designed for night-time use with eyes-closed UX.
 * Contrast is intentionally low; primary affordances pulse instead of glow.
 */

export const palette = {
  bg: '#0B0F1A',
  bgRaised: '#121828',
  bgElevated: '#1A2238',
  text: '#E8EDF7',
  textDim: '#8C97AE',
  accent: '#7B9CFF',
  accentDeep: '#3E58B8',
  success: '#5CC8A5',
  warning: '#E6B970',
  danger: '#E07A7A',
  bpmRing: '#7B9CFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 36, fontWeight: '300' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '500' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '400' as const, color: palette.textDim },
} as const;
