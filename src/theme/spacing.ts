/**
 * Spacing scale (4px base unit) and border radii — from DESIGN.md tokens.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

/**
 * Border radii. The system uses exactly: 12px cards, 8px inputs/buttons(secondary),
 * and 9999 full-pill for search bars, badges, avatars, and primary pill controls.
 */
export const radii = {
  card: 12,
  input: 8,
  button: 8,
  pill: 9999,
} as const;

export const shadows = {
  // Subtle layered shadow used for the search bar and small floating chips.
  search: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  overlay: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
} as const;

export type SpacingToken = keyof typeof spacing;
