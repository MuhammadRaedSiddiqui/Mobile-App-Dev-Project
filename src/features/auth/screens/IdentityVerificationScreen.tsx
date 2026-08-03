import { useState } from 'react';
import { Alert, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
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

  if (step === 3) {
    return (
      <ImageBackground
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSIUZPEbYr4TePQZmzNieHIbdZUyDeYIoz4i5ekKavh_iSUj0yojR51TNHd2lp_8Hyb22XYirdTbyBLHZkGpqBs2Hgx5O_p-DrdQcRPMeeKbidr0LfV0ONGqzJbfr8LSKWIkujmESU5nCUK_GrmQKtqdxCFO4T1v9MVzVGEfuOP4S53stykFqeLMIUo5V8oM7nArqXQVe_0YGHzHi8CD_tf7WEojX37weH_pj7wcuujOaAZ-m63yhqjA' }}
        style={styles.cameraBackground}
        imageStyle={styles.cameraImage}
      >
        <View style={styles.cameraShade} />
        <SafeAreaView style={styles.cameraSafe}>
          <CaptureHeader onBack={() => setStep(2)} />
          <View style={styles.cameraContent}>
            <Text style={styles.cameraTitle}>Scan your document</Text>
            <Text style={styles.cameraCopy}>Position your ID within the frame. Ensure it is well-lit and all details are clearly visible.</Text>
            <Pressable style={styles.viewfinder} onPress={() => chooseImage(true)}>
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.cameraPreview} /> : null}
              <View style={[styles.corner, styles.cornerTopLeft]} /><View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} /><View style={[styles.corner, styles.cornerBottomRight]} />
            </Pressable>
            <View style={styles.detectBadge}><Text style={styles.detectDot}>✓</Text><Text style={styles.detectText}>{imageUri ? 'ID detected — ready to verify' : 'Position document within frame'}</Text></View>
          </View>
          <View style={styles.cameraControls}>
            <Pressable disabled={busy} onPress={imageUri ? finish : () => chooseImage(true)} style={[styles.shutter, busy && styles.shutterBusy]} accessibilityLabel={imageUri ? 'Verify account' : 'Take photo'}>
              <View style={styles.shutterInner}><Text style={styles.shutterText}>{imageUri ? '✓' : ''}</Text></View>
            </Pressable>
            <Pressable onPress={() => chooseImage(false)}><Text style={styles.cameraUpload}>Upload photo manually</Text></Pressable>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header step={step} onBack={() => (step === 1 ? navigation.goBack() : setStep(step - 1))} />
      {step === 1 ? (
        <View style={styles.intro}>
          <IdIllustration />
          <Text style={styles.title}>Verify your identity to{`\n`}finish booking</Text>
          <Text style={styles.copy}>We ask guests and hosts to get verified to help keep our community safe.</Text>
          <Button label="Continue" onPress={() => setStep(2)} fullWidth style={styles.introButton} />
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
      ) : null}
    </SafeAreaView>
  );
}

function IdIllustration() {
  return (
    <View style={styles.idCard}>
      <View style={styles.personColumn}>
        <View style={styles.portrait}><View style={styles.head} /><View style={styles.shoulders} /></View>
        <View style={styles.nameLine} /><View style={styles.detailLine} />
      </View>
      <View style={styles.idLines}>
        <View style={styles.idIcon} /><View style={styles.idText} />
        <View style={styles.idLong} />
        <View style={styles.idIcon} /><View style={styles.idText} />
        <View style={styles.idLong} />
      </View>
      <View style={styles.verifyBadge}><Text style={styles.verifyBadgeText}>✓</Text></View>
    </View>
  );
}

function Header({ step, onBack }: { step: number; onBack: () => void }) {
  return <View style={styles.header}><Pressable onPress={onBack} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable><View><Text style={styles.headerTitle}>Identity Verification</Text><Text style={styles.step}>Step {step} of 3</Text></View><View style={styles.placeholder} /><View style={styles.progress}>{[1, 2, 3].map((n) => <View key={n} style={[styles.progressPart, n <= step && styles.progressActive]} />)}</View></View>;
}

function CaptureHeader({ onBack }: { onBack: () => void }) {
  return <View style={styles.captureHeader}><Pressable onPress={onBack} hitSlop={12}><Text style={styles.captureBack}>‹</Text></Pressable><View><Text style={styles.captureHeaderTitle}>Identity Verification</Text><Text style={styles.captureStep}>Step 3 of 3</Text></View><View style={styles.placeholder} /><View style={styles.captureProgress}>{[1, 2, 3].map((n) => <View key={n} style={styles.captureProgressPart} />)}</View></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }, back: { fontSize: 36, lineHeight: 36, color: colors.textPrimary }, placeholder: { width: 24 }, headerTitle: { ...typography.ui, fontWeight: '600', textAlign: 'center', color: colors.textPrimary }, step: { ...typography.caption, textAlign: 'center', color: colors.textSecondary, marginTop: 2 }, progress: { position: 'absolute', bottom: 0, left: spacing.lg, right: spacing.lg, flexDirection: 'row', gap: 4 }, progressPart: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border }, progressActive: { backgroundColor: colors.textPrimary }, intro: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 122, paddingBottom: spacing.lg }, page: { flex: 1, padding: spacing.xl }, idCard: { width: 280, height: 180, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#eeeeee', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 38 }, personColumn: { alignItems: 'center' }, portrait: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#f1f1f1', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }, head: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#747b8b', marginBottom: 2 }, shoulders: { width: 68, height: 34, backgroundColor: '#747b8b', borderTopLeftRadius: 34, borderTopRightRadius: 34 }, nameLine: { width: 62, height: 12, backgroundColor: '#e6e7ea', borderRadius: 8, marginTop: 12 }, detailLine: { width: 42, height: 9, backgroundColor: '#f1f1f2', borderRadius: 8, marginTop: 7 }, idLines: { gap: 8, width: 54 }, idIcon: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#e1e3e8' }, idText: { width: 34, height: 7, borderRadius: 5, backgroundColor: '#f0f0f2', marginTop: -26, marginLeft: 27 }, idLong: { width: 46, height: 8, borderRadius: 5, backgroundColor: '#f0f0f2', marginBottom: 6 }, verifyBadge: { position: 'absolute', left: 120, top: 84, width: 29, height: 29, borderRadius: 15, backgroundColor: '#ff385c', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }, verifyBadgeText: { color: colors.textInverse, fontWeight: '700', fontSize: 16 }, title: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' }, copy: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: spacing.md }, bottomButton: { marginTop: spacing.xxl }, introButton: { marginTop: 'auto' }, link: { ...typography.caption, color: colors.textPrimary, textDecorationLine: 'underline', marginTop: spacing.lg }, options: { gap: spacing.md, marginTop: spacing.xxl }, option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: spacing.lg, backgroundColor: colors.surface }, optionSelected: { borderColor: colors.textPrimary, backgroundColor: colors.canvas }, optionLabel: { ...typography.ui, color: colors.textPrimary }, optionHint: { ...typography.caption, color: colors.textSecondary, marginTop: 3 }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textSecondary }, radioSelected: { borderColor: colors.textPrimary, borderWidth: 6 }, capture: { flexGrow: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: '#303031' }, white: { color: colors.textInverse }, whiteCopy: { color: '#e5e2e1' }, frame: { width: '100%', aspectRatio: 1.58, borderRadius: radii.card, borderWidth: 3, borderColor: '#80f9bd', marginTop: spacing.xxl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, frameText: { ...typography.ui, color: colors.textInverse }, preview: { width: '100%', height: '100%' }, detected: { ...typography.caption, color: '#80f9bd', marginTop: spacing.xl }, upload: { ...typography.ui, color: colors.textInverse, textDecorationLine: 'underline', marginTop: spacing.lg }, done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }, check: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }, checkText: { fontSize: 48, color: colors.textInverse },
  cameraBackground: { flex: 1, backgroundColor: '#303031' },
  cameraImage: { opacity: 0.48 },
  cameraShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.46)' },
  cameraSafe: { flex: 1 },
  captureHeader: { height: 108, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: 'rgba(0,0,0,0.52)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' },
  captureBack: { fontSize: 42, lineHeight: 42, color: colors.textInverse },
  captureHeaderTitle: { ...typography.ui, fontWeight: '600', textAlign: 'center', color: colors.textInverse },
  captureStep: { ...typography.caption, color: '#e5e2e1', textAlign: 'center', marginTop: 2 },
  captureProgress: { position: 'absolute', bottom: 16, left: spacing.lg, right: spacing.lg, flexDirection: 'row', gap: 5 },
  captureProgressPart: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.textInverse },
  cameraContent: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 28 },
  cameraTitle: { ...typography.heading, color: colors.textInverse, textAlign: 'center' },
  cameraCopy: { ...typography.body, color: '#f2f0f0', textAlign: 'center', lineHeight: 21, marginTop: spacing.sm, maxWidth: 340 },
  viewfinder: { width: '92%', aspectRatio: 1.58, marginTop: 88, borderRadius: radii.card, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  cameraPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  corner: { position: 'absolute', width: 38, height: 38, borderColor: colors.textInverse },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
  detectBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239,237,237,0.92)', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: 34 },
  detectDot: { color: colors.primary, fontWeight: '700' }, detectText: { ...typography.caption, color: colors.textPrimary },
  cameraControls: { alignItems: 'center', paddingBottom: spacing.xl, gap: spacing.lg, backgroundColor: 'rgba(0,0,0,0.25)' },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: colors.textInverse, alignItems: 'center', justifyContent: 'center' },
  shutterBusy: { opacity: 0.55 },
  shutterInner: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.textInverse, alignItems: 'center', justifyContent: 'center' }, shutterText: { fontSize: 34, color: colors.textPrimary },
  cameraUpload: { ...typography.ui, color: colors.textInverse, textDecorationLine: 'underline' },
});
