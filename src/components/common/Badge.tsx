import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

type Tone = 'neutral' | 'muted' | 'alert';

interface BadgeProps {
  label: string;
  tone?: Tone;
  /** Show a small leading status dot (used by freshness pills). */
  dot?: boolean;
  style?: ViewStyle;
}

/**
 * Small pill. Follows the prototype's restrained palette: neutral = near-black
 * dot on white, muted = grey (aging), alert = coral wash (stale, "needs attention").
 */
export function Badge({ label, tone = 'neutral', dot = false, style }: BadgeProps) {
  return (
    <View style={[styles.base, toneStyles[tone].container, style]}>
      {dot ? <View style={[styles.dot, toneStyles[tone].dot]} /> : null}
      <Text style={[styles.label, toneStyles[tone].label]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  label: { ...typography.caption, fontWeight: '600' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

const toneStyles: Record<Tone, { container: ViewStyle; label: object; dot: object }> = {
  neutral: {
    container: { backgroundColor: colors.surface },
    label: { color: colors.textPrimary },
    dot: { backgroundColor: colors.fresh },
  },
  muted: {
    container: { backgroundColor: colors.surface },
    label: { color: colors.textSecondary },
    dot: { backgroundColor: colors.aging },
  },
  alert: {
    container: { backgroundColor: colors.staleBg },
    label: { color: colors.stale },
    dot: { backgroundColor: colors.stale },
  },
};
