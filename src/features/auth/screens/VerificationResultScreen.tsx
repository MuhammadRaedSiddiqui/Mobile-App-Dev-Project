import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'VerificationResult'>;

/** Final confirmation states based on the supplied successful/failed prototypes. */
export function VerificationResultScreen({ route, navigation }: Props) {
  const success = route.params.outcome === 'success';
  const goToProfile = () => navigation.popToTop();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>{success ? 'Identity Verification' : 'Estate Ease'}</Text>
      </View>
      <View style={styles.content}>
        {success ? <Confetti /> : null}
        <View style={[styles.icon, success ? styles.successIcon : styles.failedIcon]}>
          <Text style={[styles.iconText, !success && styles.failedIconText]}>{success ? '✓' : '⚠'}</Text>
        </View>
        <Text style={styles.title}>{success ? 'Identity verified' : 'Verification incomplete'}</Text>
        <Text style={styles.copy}>
          {success
            ? 'Your identity has been successfully verified. Your information is encrypted and stored securely. You can now continue with your account.'
            : 'We couldn’t verify your identity. This usually happens if the photo was unclear or the document is unsupported. Don’t worry, you can try again.'}
        </Text>
        {success ? (
          <Button label="Continue" onPress={goToProfile} fullWidth style={styles.primary} />
        ) : (
          <>
            <Button label="Try again" onPress={() => navigation.replace('IdentityVerification')} fullWidth style={styles.primary} />
            <Pressable onPress={goToProfile} style={styles.support}>
              <Text style={styles.supportText}>Contact support</Text>
            </Pressable>
          </>
        )}
      </View>
      {success ? <View style={styles.footer}><Text>© 2024 Estate Ease</Text><Text>Privacy Policy</Text><Text>Terms of Service</Text></View> : null}
    </SafeAreaView>
  );
}

function Confetti() {
  return <View pointerEvents="none" style={styles.confetti}>{Array.from({ length: 13 }, (_, index) => <View key={index} style={[styles.confettiDot, { left: `${(index * 29) % 100}%`, top: `${(index * 47) % 70}%`, backgroundColor: index % 3 === 0 ? '#c9003d' : '#ffb2b6', transform: [{ rotate: `${index * 23}deg` }] }]} />)}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  topBar: { height: 80, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  brand: { ...typography.headingSm, fontWeight: '500', color: colors.textPrimary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: 56, overflow: 'hidden' },
  icon: { width: 96, height: 96, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl, zIndex: 1 },
  successIcon: { backgroundColor: colors.primary },
  failedIcon: { backgroundColor: colors.surfaceMuted },
  iconText: { fontSize: 48, fontWeight: '700', color: colors.textInverse },
  failedIconText: { color: colors.textSecondary },
  title: { ...typography.headingSm, color: colors.textPrimary, textAlign: 'center' },
  copy: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, marginTop: spacing.md, maxWidth: 340, zIndex: 1 },
  primary: { marginTop: spacing.xxxl, zIndex: 1 },
  support: { marginTop: spacing.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.textPrimary, borderRadius: radii.card, width: '100%', alignItems: 'center', zIndex: 1 },
  supportText: { ...typography.ui, color: colors.textPrimary },
  footer: { height: 72, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: spacing.md },
  confetti: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  confettiDot: { position: 'absolute', width: 13, height: 13, borderRadius: 2, opacity: 0.8 },
});
