import { TextStyle } from 'react-native';

/**
 * Typography scale — DESIGN.md uses Airbnb Cereal VF; the prototype substitutes
 * Inter (an approved substitute). React Native ships system fonts by default, so
 * we reference "Inter" but degrade gracefully to the platform sans until the font
 * is bundled in src/assets (Phase 1 polish).
 *
 * Sizes/weights mirror the prototype: 14px body, 16px UI, 20/22px section titles,
 * 28px page titles, with tight negative tracking at display sizes.
 */
export const fontFamily = {
  regular: 'Inter',
  medium: 'Inter',
  semibold: 'Inter',
  bold: 'Inter',
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

type Variant = 'caption' | 'body' | 'bodyStrong' | 'ui' | 'subheading' | 'headingSm' | 'heading';

export const typography: Record<Variant, TextStyle> = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  ui: { fontSize: 16, lineHeight: 20, fontWeight: '500' },
  subheading: { fontSize: 20, lineHeight: 24, fontWeight: '600', letterSpacing: -0.18 },
  headingSm: { fontSize: 22, lineHeight: 26, fontWeight: '600', letterSpacing: -0.44 },
  heading: { fontSize: 28, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6 },
};
