/**
 * Central design tokens for MISMAS, sourced directly from the real brand
 * (@mishmash_telaviv on Instagram): a warm tangerine orange wordmark on
 * black/cream, with a sunburst-yellow accent motif. Every screen should
 * pull colors/type/spacing from here rather than hardcoding values.
 */

export const colors = {
  // Warm near-black, not a flat #000 — matches the brand's dark panels.
  background: '#120D08',
  surface: '#1F1710',
  surfaceAlt: '#2B2016',

  // The MISMAS orange — sampled from the Instagram wordmark/branding.
  brand: '#F2600C',
  brandPressed: '#D1500A',

  // Sunburst-yellow accent, used sparingly for highlights/decoration.
  accent: '#FFC93C',

  // Warm cream — the brand's light neutral, used for light text/cards.
  cream: '#EDE8DC',

  textPrimary: '#FBF7F0',
  textSecondary: '#C9BFAE',
  textOnBrand: '#120D08',

  error: '#FF6B5E',
  border: '#3A2C1C',
} as const;

export const typography = {
  // Poppins' rounded terminals echo the bubble-letter wordmark without
  // needing a custom font license. Falls back to system sans while
  // loading (see app/_layout.tsx).
  display: 'Poppins_800ExtraBold',
  heading: 'Poppins_700Bold',
  body: 'Poppins_500Medium',
  bodyRegular: 'Poppins_400Regular',
  fallback: 'System',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;
