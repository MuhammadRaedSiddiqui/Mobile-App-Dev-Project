/**
 * Estate Ease color palette — derived from DESIGN.md (Airbnb "quiet white gallery
 * wall with one coral bookmark") and the /design prototype.
 *
 * Rausch (coral) is an ACTION color only — CTAs, active states, and the single
 * "needs attention" trust signal (stale). Never a background/brand paint.
 */
export const palette = {
  rausch: '#ff385c', // primary action / brand accent
  rausch600: '#e00b41', // pressed/active variant
  rauschTint: '#fff0f2', // soft coral wash (stale pill background)

  hof: '#222222', // primary text, near-black neutral
  foggy: '#6a6a6a', // secondary text, muted labels
  grey500: '#c1c1c1', // disabled/placeholder text, muted icons
  bebe: '#ebebeb', // hairline borders, dividers
  deco: '#dddddd', // muted surfaces, skeleton placeholders
  faint: '#f7f7f7', // page canvas (off-white)
  white: '#ffffff', // elevated card/input surface

  // Semantic
  success: '#222222', // "fresh" reads neutral/confident, not green (per DESIGN.md restraint)
  danger: '#e00b41',
} as const;

export const colors = {
  // Text
  textPrimary: palette.hof,
  textSecondary: palette.foggy,
  textDisabled: palette.grey500,
  textInverse: palette.white,

  // Surfaces
  canvas: palette.faint,
  surface: palette.white,
  surfaceMuted: palette.deco,

  // Lines
  border: palette.bebe,
  divider: palette.bebe,

  // Action
  primary: palette.rausch,
  primaryPressed: palette.rausch600,
  onPrimary: palette.white,
  white: palette.white,
  danger: palette.danger,

  // Freshness signal
  fresh: palette.hof,
  aging: palette.grey500,
  stale: palette.rausch,
  staleBg: palette.rauschTint,
} as const;

export type ColorToken = keyof typeof colors;
