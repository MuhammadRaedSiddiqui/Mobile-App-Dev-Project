import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TabIcon } from '@/components/common';
import { colors, radii, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { invalidateBrowse } from '@/store/slices/metaSlice';
import { trustService } from '@/services';
import type { ReportReason } from '@/utils/types';
import type { MainStackParamList } from '@/navigation/types';
import { reportErrorMessage } from '../reportErrors';

type Props = NativeStackScreenProps<MainStackParamList, 'ReportListing'>;

/**
 * Every reason lands in the same place: it counts toward the report threshold
 * that drops a listing out of default browse. Nothing routes 'scam' or
 * 'offensive' to moderation yet.
 */
const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inaccurate', label: 'Inaccurate or incorrect listing info' },
  { value: 'unavailable', label: 'Already rented or no longer available' },
  { value: 'scam', label: 'It’s a scam' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Something else' },
];

function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

export function ReportListingScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onHelp = () => {
    Alert.alert(
      'About reporting',
      'Reports go to the agent as a prompt to re-verify the listing. Enough reports and it stops showing up in browse until they do.',
    );
  };

  const onSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      const res = await trustService.report(listingId, user?.uid, reason);
      // Browse/search caches still hold this listing; the server may have just
      // dropped it, so force the next list fetch to go out fresh.
      dispatch(invalidateBrowse());
      navigation.navigate({
        name: 'ListingDetail',
        params: {
          listingId,
          reportResult: {
            count: res.unavailableReports,
            suppressed: res.suppressed,
            alreadyReported: res.alreadyReported,
            suppressionThreshold: res.suppressionThreshold,
          },
        },
        merge: true,
      });
    } catch (err) {
      const { title, body } = reportErrorMessage(err);
      Alert.alert(title, body);
    } finally {
      setSubmitting(false);
    }
  };

  const nextDisabled = !reason || submitting;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
        >
          <TabIcon name="close" color={colors.textPrimary} size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>Report a concern</Text>
        <Pressable
          onPress={onHelp}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="About reporting"
          hitSlop={8}
        >
          <TabIcon name="help" color={colors.textPrimary} size={20} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Why are you reporting this listing?</Text>

        <View style={styles.privacy}>
          <TabIcon name="lock" color={colors.textSecondary} size={20} />
          <Text style={styles.privacyText}>
            Your report is confidential. We won’t share this with the host.
          </Text>
        </View>

        <View style={styles.card}>
          {REASONS.map((item, index) => (
            <Pressable
              key={item.value}
              onPress={() => setReason(item.value)}
              style={[styles.row, index === REASONS.length - 1 && styles.rowLast]}
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === item.value }}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Radio selected={reason === item.value} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityRole="button"
          disabled={submitting}
        >
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
        <Pressable
          onPress={onSubmit}
          style={[styles.next, nextDisabled && styles.nextDisabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: nextDisabled }}
          disabled={nextDisabled}
        >
          <Text style={styles.nextLabel}>Next</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.ui,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  // Sits on the header's bottom edge, like the prototype's absolute-positioned bar.
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.border,
  },
  // One step, so the track reads as complete rather than stuck at a quarter.
  progressFill: { height: 2, width: '100%', backgroundColor: colors.textPrimary },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.lg },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  privacyText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { ...typography.ui, color: colors.textPrimary, flex: 1 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.textPrimary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.textPrimary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  back: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backLabel: {
    ...typography.ui,
    fontWeight: '600',
    color: colors.textPrimary,
    textDecorationLine: 'underline',
  },
  next: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  nextDisabled: { opacity: 0.45 },
  nextLabel: { ...typography.ui, fontWeight: '600', color: colors.surface },
});
