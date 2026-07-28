export { colors, palette } from './colors';
export type { ColorToken } from './colors';
export { spacing, radii, shadows } from './spacing';
export type { SpacingToken } from './spacing';
export { typography, fontFamily, fontWeight } from './typography';

import { colors } from './colors';
import { spacing, radii, shadows } from './spacing';
import { typography } from './typography';

/** Single import surface for consumers that want the whole theme object. */
export const theme = {
  colors,
  spacing,
  radii,
  shadows,
  typography,
} as const;

export type Theme = typeof theme;
