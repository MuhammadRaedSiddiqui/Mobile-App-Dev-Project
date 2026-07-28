import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';

/** Shown while a persisted session is being restored on cold launch. */
export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Estate Ease</Text>
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  brand: { ...typography.heading, color: colors.primary },
  spinner: { marginTop: spacing.lg },
});
