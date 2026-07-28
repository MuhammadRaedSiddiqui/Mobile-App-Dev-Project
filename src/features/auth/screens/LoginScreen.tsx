import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Screen } from '@/components/common';
import { colors, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearError, login } from '@/store/slices/authSlice';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const emailInvalid = touched && !/^\S+@\S+\.\S+$/.test(email);
  const passwordInvalid = touched && password.length < 6;

  const onSubmit = () => {
    setTouched(true);
    if (emailInvalid || passwordInvalid || !email || !password) return;
    dispatch(login({ email, password }));
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.brand}>Estate Ease</Text>
          <Text style={styles.tagline}>Rentals you can actually trust.</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            error={emailInvalid ? 'Enter a valid email address.' : undefined}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={passwordInvalid ? 'Password must be at least 6 characters.' : undefined}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label="Log in"
            onPress={onSubmit}
            loading={loading}
            fullWidth
            style={styles.cta}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to Estate Ease? </Text>
            <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
              <Text style={styles.link}>Create an account</Text>
            </Pressable>
          </View>

          <View style={styles.demo}>
            <Text style={styles.demoText}>Demo — seeker: ayesha@example.com</Text>
            <Text style={styles.demoText}>Demo — agent: danish@example.com</Text>
            <Text style={styles.demoText}>Password for both: password123</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.huge, paddingBottom: spacing.xxl },
  brand: { ...typography.heading, color: colors.primary },
  tagline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  form: { gap: spacing.lg },
  error: { ...typography.caption, color: colors.danger },
  cta: { marginTop: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  footerText: { ...typography.body, color: colors.textSecondary },
  link: { ...typography.bodyStrong, color: colors.primary },
  demo: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  demoText: { ...typography.caption, color: colors.textSecondary },
});
