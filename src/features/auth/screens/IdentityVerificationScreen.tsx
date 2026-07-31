import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { completeVerification } from '@/store/slices/authSlice';
import type { IdentityDocumentType } from '@/utils/types';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'IdentityVerification'>;

const documents: Array<{ value: IdentityDocumentType; label: string; hint: string }> = [
  { value: 'passport', label: 'Passport', hint: 'Photo page' },
  { value: 'drivers_license', label: 'Driver’s license', hint: 'Front side' },
  { value: 'national_id', label: 'National ID card', hint: 'CNIC front side' },
];

export function IdentityVerificationScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.user?.verificationStatus);
  const [step, setStep] = useState(status === 'verified' ? 1 : 1);
  const [documentType, setDocumentType] = useState<IdentityDocumentType | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chooseImage = async (camera: boolean) => {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access so you can add a photo of your document.');
      return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const finish = async () => {
    if (!documentType || !imageUri) return;
    setBusy(true);
    try {
      await dispatch(completeVerification(documentType)).unwrap();
      navigation.replace('VerificationResult', { outcome: 'success' });
    } catch {
      navigation.replace('VerificationResult', { outcome: 'failed' });
    } finally {
      setBusy(false);
    }
  };

  if (status === 'verified') {
    return (
      <SafeAreaView style={styles.safe}>
        <Header step={3} onBack={() => navigation.goBack()} />
        <View style={styles.done}>
          <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
          <Text style={styles.title}>Identity verified</Text>
          <Text style={styles.copy}>Your account has completed identity verification.</Text>
          <Button label="Done" onPress={() => navigation.goBack()} fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header step={step} onBack={() => (step === 1 ? navigation.goBack() : setStep(step - 1))} />
      {step === 1 ? (
        <View style={styles.intro}>
          <View style={styles.illustration}><Text style={styles.illustrationIcon}>▣</Text><Text style={styles.badge}>✓</Text></View>
          <Text style={styles.title}>Verify your identity</Text>
          <Text style={styles.copy}>Help keep Estate Ease safe by verifying a government-issued photo ID.</Text>
          <Button label="Continue" onPress={() => setStep(2)} fullWidth style={styles.bottomButton} />
          <Text style={styles.link}>How identity verification works</Text>
        </View>
      ) : step === 2 ? (
        <View style={styles.page}>
          <Text style={styles.title}>Select your ID type</Text>
          <Text style={styles.copy}>Choose a government-issued photo ID. Your document is used only for this verification flow.</Text>
          <View style={styles.options}>
            {documents.map((item) => (
              <Pressable key={item.value} onPress={() => setDocumentType(item.value)} style={[styles.option, documentType === item.value && styles.optionSelected]}>
                <View><Text style={styles.optionLabel}>{item.label}</Text><Text style={styles.optionHint}>{item.hint}</Text></View>
                <View style={[styles.radio, documentType === item.value && styles.radioSelected]} />
              </Pressable>
            ))}
          </View>
          <Button label="Continue" onPress={() => setStep(3)} disabled={!documentType} fullWidth style={styles.bottomButton} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.capture}>
          <Text style={[styles.title, styles.white]}>Scan your document</Text>
          <Text style={[styles.copy, styles.whiteCopy]}>Position your ID in the frame. Ensure every detail is clear and well-lit.</Text>
          <Pressable style={styles.frame} onPress={() => chooseImage(true)}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : <Text style={styles.frameText}>Tap to take a photo</Text>}
          </Pressable>
          <Text style={styles.detected}>{imageUri ? 'ID detected — ready to verify' : 'Keep your document within the frame'}</Text>
          <Button label={imageUri ? 'Verify account' : 'Take photo'} onPress={imageUri ? finish : () => chooseImage(true)} loading={busy} fullWidth style={styles.bottomButton} />
          <Pressable onPress={() => chooseImage(false)}><Text style={styles.upload}>Upload photo manually</Text></Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Header({ step, onBack }: { step: number; onBack: () => void }) {
  return <View style={styles.header}><Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable><View><Text style={styles.headerTitle}>Identity Verification</Text><Text style={styles.step}>Step {step} of 3</Text></View><View style={styles.placeholder} /><View style={styles.progress}>{[1, 2, 3].map((n) => <View key={n} style={[styles.progressPart, n <= step && styles.progressActive]} />)}</View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }, back: { fontSize: 36, lineHeight: 36, color: colors.textPrimary }, placeholder: { width: 24 }, headerTitle: { ...typography.ui, fontWeight: '600', textAlign: 'center', color: colors.textPrimary }, step: { ...typography.caption, textAlign: 'center', color: colors.textSecondary, marginTop: 2 }, progress: { position: 'absolute', bottom: 0, left: spacing.lg, right: spacing.lg, flexDirection: 'row', gap: 4 }, progressPart: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border }, progressActive: { backgroundColor: colors.textPrimary }, intro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, page: { flex: 1, padding: spacing.xl }, illustration: { width: 220, height: 145, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxl }, illustrationIcon: { fontSize: 72, color: colors.textSecondary }, badge: { position: 'absolute', right: 40, bottom: 30, fontSize: 20, color: colors.surface, backgroundColor: colors.primary, width: 30, height: 30, borderRadius: 15, textAlign: 'center', overflow: 'hidden' }, title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' }, copy: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: spacing.md }, bottomButton: { marginTop: spacing.xxl }, link: { ...typography.caption, color: colors.textPrimary, textDecorationLine: 'underline', marginTop: spacing.lg }, options: { gap: spacing.md, marginTop: spacing.xxl }, option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.surface }, optionSelected: { borderColor: colors.textPrimary, backgroundColor: colors.canvas }, optionLabel: { ...typography.ui, color: colors.textPrimary }, optionHint: { ...typography.caption, color: colors.textSecondary, marginTop: 3 }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textSecondary }, radioSelected: { borderColor: colors.textPrimary, borderWidth: 6 }, capture: { flexGrow: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303031' }, white: { color: colors.textInverse }, whiteCopy: { color: '#e5e2e1' }, frame: { width: '100%', aspectRatio: 1.58, borderRadius: radii.card, borderWidth: 3, borderColor: '#80f9bd', marginTop: spacing.xxl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, frameText: { ...typography.ui, color: colors.textInverse }, preview: { width: '100%', height: '100%' }, detected: { ...typography.caption, color: '#80f9bd', marginTop: spacing.xl }, upload: { ...typography.ui, color: colors.textInverse, textDecorationLine: 'underline', marginTop: spacing.lg }, done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, check: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }, checkText: { fontSize: 48, color: colors.textInverse },
});
