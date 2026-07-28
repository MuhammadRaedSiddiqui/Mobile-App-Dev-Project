import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Screen } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearError, register } from '@/store/slices/authSlice';
import type { UserRole } from '@/utils/types';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.auth);

  const [role, setRole] = useState<UserRole>('seeker');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const nameInvalid = touched && displayName.trim().length < 2;
  const emailInvalid = touched && !/^\S+@\S+\.\S+$/.test(email);
  const passwordInvalid = touched && password.length < 6;
  const phoneInvalid = touched && role === 'agent' && phone.trim().length < 7;

  const onSubmit = () => {
    setTouched(true);
    if (nameInvalid || emailInvalid || passwordInvalid || phoneInvalid) return;
    if (!displayName || !email || !password || (role === 'agent' && !phone)) return;
    dispatch(register({ displayName, email, password, role, phone: phone || undefined }));
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Tell us how you’ll use Estate Ease.</Text>

        <View style={styles.roleRow}>
          <RolePill
            label="I’m looking to rent"
            active={role === 'seeker'}
            onPress={() => setRole('seeker')}
          />
          <RolePill
            label="I’m an agent"
            active={role === 'agent'}
            onPress={() => setRole('agent')}
          />
        </View>

        <View style={styles.form}>
          <Input
            label="Full name"
            placeholder="Ayesha Khan"
            value={displayName}
            onChangeText={setDisplayName}
            error={nameInvalid ? 'Please enter your name.' : undefined}
          />
          <Input
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={emailInvalid ? 'Enter a valid email address.' : undefined}
          />
          <Input
            label="Password"
            placeholder="At least 6 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={passwordInvalid ? 'Password must be at least 6 characters.' : undefined}
          />
          {role === 'agent' ? (
            <Input
              label="Phone (shown to renters)"
              placeholder="0300-1234567"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={phoneInvalid ? 'Agents need a contact number.' : undefined}
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Create account"
            onPress={onSubmit}
            loading={loading}
            fullWidth
            style={styles.cta}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8}>
              <Text style={styles.link}>Log in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function RolePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.headingSm, color: colors.textPrimary, marginTop: spacing.xl },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  pill: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  pillActive: { borderColor: colors.textPrimary, backgroundColor: colors.textPrimary },
  pillText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  pillTextActive: { color: colors.textInverse },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  error: { ...typography.caption, color: colors.danger },
  cta: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  footerText: { ...typography.body, color: colors.textSecondary },
  link: { ...typography.bodyStrong, color: colors.primary },
});
