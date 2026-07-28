import { StyleSheet, Text, View } from 'react-native';
import { Screen } from './Screen';
import { colors, spacing, typography } from '@/theme';

interface ComingSoonProps {
  title: string;
  message: string;
  phase?: string;
}

/**
 * Placeholder for screens delivered in later phases. Keeps navigation whole in the
 * Phase 1 vertical slice without faking functionality that isn't built yet.
 */
export function ComingSoon({ title, message, phase }: ComingSoonProps) {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {phase ? <Text style={styles.phase}>{phase}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  title: { ...typography.subheading, color: colors.textPrimary },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  phase: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
