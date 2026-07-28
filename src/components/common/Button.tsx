import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

type Variant = 'primary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Primary = coral filled action (one per surface). Ghost = hairline outline
 * secondary action. Mirrors .btn-primary / .btn-ghost in the prototype.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && (isPrimary ? styles.primaryPressed : styles.ghostPressed),
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.textPrimary} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fullWidth: { alignSelf: 'stretch' },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.textPrimary },
  ghostPressed: { backgroundColor: colors.canvas },
  disabled: { opacity: 0.45 },
  label: { ...typography.bodyStrong },
  labelPrimary: { color: colors.onPrimary },
  labelGhost: { color: colors.textPrimary },
});
