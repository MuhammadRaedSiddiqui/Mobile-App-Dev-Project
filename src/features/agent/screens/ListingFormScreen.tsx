import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, Screen } from '@/components/common';
import { ImagePickerField } from '@/components/listing/ImagePickerField';
import { colors, spacing, typography } from '@/theme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { invalidateBrowse } from '@/store/slices/metaSlice';
import { agentService } from '@/services/agent';
import type { ListingFormInput } from '@/services/agent';
import type { LocalImage } from '@/services/media';
import type { CategoryId, PriceType } from '@/utils/types';
import { KARACHI_AREAS } from '@/utils/karachiAreas';
import type { MainStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ListingForm'>;

const STEPS = ['Basics', 'Location', 'Costs', 'Photos'] as const;

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'one-bed', label: '1-Bed Flat' },
  { id: 'portion', label: 'Portion' },
  { id: 'shared', label: 'Shared / Roommate' },
  { id: 'studio', label: 'Studio' },
];

const EMPTY: ListingFormInput = {
  categoryId: 'one-bed',
  title: '',
  description: '',
  price: 0,
  priceType: 'monthly',
  area: 0,
  imageUrls: [],
  location: { lat: 24.9213, lng: 67.0871, address: '', city: 'Karachi', area: 'Gulshan-e-Iqbal' },
  locationTags: [],
  cost: { rent: 0, depositMonths: 2, monthlyMaintenance: 0, estimatedUtilities: 0 },
  status: 'active',
};

export function ListingFormScreen({ route, navigation }: Props) {
  const dispatch = useAppDispatch();
  const uid = useAppSelector((s) => s.auth.user?.uid ?? '');
  const editId = route.params?.listingId;
  const isEdit = Boolean(editId);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingFormInput>(EMPTY);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isEdit || !editId || initialized.current) return;
    initialized.current = true;
    (async () => {
      setLoadingEdit(true);
      try {
        const existing = await agentService.getListing(editId, uid);
        if (!existing) {
          Alert.alert('Not found', 'This listing could not be loaded.');
          navigation.goBack();
          return;
        }
        setForm({
          categoryId: existing.categoryId,
          title: existing.title,
          description: existing.description,
          price: existing.price,
          priceType: existing.priceType,
          area: existing.area,
          bedrooms: existing.bedrooms,
          bathrooms: existing.bathrooms,
          imageUrls: existing.imageUrls,
          location: existing.location,
          locationTags: existing.locationTags ?? [],
          cost: {
            rent: existing.costBreakdown.rent,
            depositMonths: existing.costBreakdown.depositMonths,
            monthlyMaintenance: existing.costBreakdown.monthlyMaintenance,
            estimatedUtilities: existing.costBreakdown.estimatedUtilities,
          },
          status: existing.status === 'draft' ? 'draft' : 'active',
        });
        setImages(existing.imageUrls.map((uri) => ({ uri, remoteUrl: uri })));
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [isEdit, editId, uid, navigation]);

  const set = <K extends keyof ListingFormInput>(key: K, value: ListingFormInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setLoc = (key: keyof ListingFormInput['location'], value: string | number) =>
    setForm((f) => ({ ...f, location: { ...f.location, [key]: value } }));

  const setCost = (key: keyof ListingFormInput['cost'], value: number) =>
    setForm((f) => ({ ...f, cost: { ...f.cost, [key]: value } }));

  const selectArea = (areaName: string, lat: number, lng: number) => {
    setForm((f) => ({
      ...f,
      location: { ...f.location, area: areaName, lat, lng, city: 'Karachi' },
    }));
  };

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!form.title.trim()) return 'Title is required.';
      if (form.price <= 0) return 'Enter a monthly rent.';
      if (form.area <= 0) return 'Enter the floor area in sq ft.';
    }
    if (index === 1) {
      if (!form.location.address.trim()) return 'Address is required.';
      if (!form.location.area.trim()) return 'Pick a neighbourhood.';
    }
    if (index === 3) {
      const ready = images.filter((i) => i.remoteUrl && !i.error && !i.uploading);
      if (ready.length === 0) return 'Add at least one photo before publishing.';
      if (images.some((i) => i.uploading)) return 'Wait for uploads to finish.';
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      Alert.alert('Check this step', err);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    if (step === 0) navigation.goBack();
    else setStep((s) => s - 1);
  };

  const buildPayload = (status: 'draft' | 'active'): ListingFormInput => {
    const remoteUrls = images
      .map((i) => i.remoteUrl)
      .filter((u): u is string => Boolean(u));
    return {
      ...form,
      status,
      cost: { ...form.cost, rent: form.price },
      imageUrls: remoteUrls,
    };
  };

  const onSave = async (status: 'draft' | 'active') => {
    const basicsErr = validateStep(0);
    if (basicsErr) {
      Alert.alert('Check basics', basicsErr);
      setStep(0);
      return;
    }
    const locationErr = validateStep(1);
    if (locationErr) {
      Alert.alert('Check location', locationErr);
      setStep(1);
      return;
    }

    if (status === 'active') {
      const photoErr = validateStep(3);
      if (photoErr) {
        Alert.alert('Photos needed', photoErr);
        setStep(3);
        return;
      }
    }

    setSaving(true);
    try {
      let payload = buildPayload(status);
      if (payload.imageUrls.length === 0) {
        // Drafts may skip photos; keep API min-image rule satisfied with a placeholder.
        payload = {
          ...payload,
          imageUrls: [
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70',
          ],
        };
      }
      if (isEdit && editId) {
        await agentService.update(editId, payload);
      } else {
        await agentService.create(uid, payload);
      }
      dispatch(invalidateBrowse());
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save the listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading listing…</Text>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.stepBar}>
          {STEPS.map((label, i) => (
            <Pressable key={label} onPress={() => i <= step && setStep(i)} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>{isEdit ? 'Edit listing' : 'New listing'}</Text>
          <Text style={styles.sub}>{STEPS[step]}</Text>

          {step === 0 && (
            <View style={styles.fields}>
              <Text style={styles.sectionLabel}>Category</Text>
              <View style={styles.pills}>
                {CATEGORIES.map((c) => (
                  <Button
                    key={c.id}
                    label={c.label}
                    variant={form.categoryId === c.id ? 'primary' : 'ghost'}
                    onPress={() => set('categoryId', c.id)}
                    style={styles.pill}
                  />
                ))}
              </View>
              <Input
                label="Title"
                placeholder="e.g. 1-Bed Flat, Block 13, Gulshan"
                value={form.title}
                onChangeText={(v) => set('title', v)}
              />
              <Input
                label="Description"
                placeholder="Describe the property…"
                value={form.description}
                onChangeText={(v) => set('description', v)}
                multiline
                numberOfLines={3}
                style={styles.multiline}
              />
              <Text style={styles.sectionLabel}>Price type</Text>
              <View style={styles.pills}>
                {(['monthly', 'yearly'] as PriceType[]).map((pt) => (
                  <Button
                    key={pt}
                    label={pt === 'monthly' ? 'Monthly' : 'Yearly'}
                    variant={form.priceType === pt ? 'primary' : 'ghost'}
                    onPress={() => set('priceType', pt)}
                    style={styles.pill}
                  />
                ))}
              </View>
              <Input
                label={form.priceType === 'yearly' ? 'Yearly rent (PKR)' : 'Monthly rent (PKR)'}
                placeholder="e.g. 38000"
                keyboardType="numeric"
                value={form.price > 0 ? String(form.price) : ''}
                onChangeText={(v) => set('price', Number(v) || 0)}
              />
              <Input
                label="Area (sq ft)"
                placeholder="e.g. 650"
                keyboardType="numeric"
                value={form.area > 0 ? String(form.area) : ''}
                onChangeText={(v) => set('area', Number(v) || 0)}
              />
              <View style={styles.row}>
                <Input
                  label="Bedrooms"
                  placeholder="—"
                  keyboardType="numeric"
                  value={form.bedrooms != null ? String(form.bedrooms) : ''}
                  onChangeText={(v) => set('bedrooms', v ? Number(v) : undefined)}
                  containerStyle={styles.half}
                />
                <Input
                  label="Bathrooms"
                  placeholder="—"
                  keyboardType="numeric"
                  value={form.bathrooms != null ? String(form.bathrooms) : ''}
                  onChangeText={(v) => set('bathrooms', v ? Number(v) : undefined)}
                  containerStyle={styles.half}
                />
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.fields}>
              <Text style={styles.sectionLabel}>Neighbourhood</Text>
              <View style={styles.pills}>
                {KARACHI_AREAS.map((a) => (
                  <Button
                    key={a.area}
                    label={a.area}
                    variant={form.location.area === a.area ? 'primary' : 'ghost'}
                    onPress={() => selectArea(a.area, a.lat, a.lng)}
                    style={styles.pill}
                  />
                ))}
              </View>
              <Input
                label="Street address"
                placeholder="e.g. Block 13, Gulshan-e-Iqbal"
                value={form.location.address}
                onChangeText={(v) => setLoc('address', v)}
              />
              <Text style={styles.coordHint}>
                Pin: {form.location.lat.toFixed(4)}, {form.location.lng.toFixed(4)} (Karachi)
              </Text>
            </View>
          )}

          {step === 2 && (
            <View style={styles.fields}>
              <Text style={styles.help}>
                These feed the true monthly cost seekers see — deposit is amortized over 12 months.
              </Text>
              <View style={styles.row}>
                <Input
                  label="Deposit (months)"
                  placeholder="2"
                  keyboardType="numeric"
                  value={String(form.cost.depositMonths)}
                  onChangeText={(v) => setCost('depositMonths', Number(v) || 0)}
                  containerStyle={styles.half}
                />
                <Input
                  label="Maintenance (PKR/mo)"
                  placeholder="0"
                  keyboardType="numeric"
                  value={
                    form.cost.monthlyMaintenance > 0 ? String(form.cost.monthlyMaintenance) : ''
                  }
                  onChangeText={(v) => setCost('monthlyMaintenance', Number(v) || 0)}
                  containerStyle={styles.half}
                />
              </View>
              <Input
                label="Est. utilities (PKR/mo)"
                placeholder="0"
                keyboardType="numeric"
                value={form.cost.estimatedUtilities > 0 ? String(form.cost.estimatedUtilities) : ''}
                onChangeText={(v) => setCost('estimatedUtilities', Number(v) || 0)}
              />
            </View>
          )}

          {step === 3 && (
            <View style={styles.fields}>
              <ImagePickerField images={images} agentId={uid} onChange={setImages} disabled={saving} />
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button label={step === 0 ? 'Cancel' : 'Back'} variant="ghost" onPress={goBack} />
          {step < STEPS.length - 1 ? (
            <Button label="Continue" onPress={goNext} style={styles.footerPrimary} />
          ) : (
            <View style={styles.footerActions}>
              <Button
                label="Save draft"
                variant="ghost"
                onPress={() => onSave('draft')}
                loading={saving}
              />
              <Button
                label={isEdit ? 'Save changes' : 'Publish'}
                onPress={() => onSave('active')}
                loading={saving}
                style={styles.footerPrimary}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { ...typography.body, color: colors.textSecondary, margin: spacing.xl },
  stepBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  stepDotActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  stepNum: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  stepNumActive: { color: colors.textInverse },
  stepLabel: { ...typography.caption, color: colors.textSecondary, fontSize: 10 },
  stepLabelActive: { color: colors.textPrimary, fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: 120 },
  heading: { ...typography.heading, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.lg },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  fields: { gap: spacing.lg },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { marginBottom: spacing.xs },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  help: { ...typography.body, color: colors.textSecondary },
  coordHint: { ...typography.caption, color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerActions: { flexDirection: 'row', gap: spacing.sm, flex: 1, justifyContent: 'flex-end' },
  footerPrimary: { minWidth: 120 },
});
