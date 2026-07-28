import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';
import { MEDIA_LIMITS, mediaService, LocalImage } from '@/services/media';

interface ImagePickerFieldProps {
  images: LocalImage[];
  agentId: string;
  onChange: (images: LocalImage[]) => void;
  disabled?: boolean;
}

/**
 * Ordered listing photo strip: add from camera/gallery, compress+upload,
 * remove, and reorder. Caps at MEDIA_LIMITS.maxImages.
 */
export function ImagePickerField({ images, agentId, onChange, disabled }: ImagePickerFieldProps) {
  const remaining = MEDIA_LIMITS.maxImages - images.length;
  const busy = images.some((i) => i.uploading);

  const addFromUris = async (uris: string[]) => {
    if (!uris.length) return;
    const placeholders: LocalImage[] = uris.map((uri) => ({ uri, uploading: true }));
    const base = [...images, ...placeholders];
    onChange(base);

    const results: LocalImage[] = [];
    for (const uri of uris) {
      try {
        const remoteUrl = await mediaService.uploadOne(uri, agentId);
        results.push({ uri: remoteUrl, remoteUrl });
      } catch {
        results.push({ uri, error: 'Upload failed — remove and retry.' });
      }
    }
    onChange([...base.slice(0, base.length - placeholders.length), ...results]);
  };

  const handleAdd = () => {
    if (disabled || busy || remaining <= 0) return;
    Alert.alert('Add photos', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          try {
            await addFromUris(await mediaService.pickFromCamera(remaining));
          } catch (e) {
            Alert.alert('Permission needed', e instanceof Error ? e.message : 'Could not open camera.');
          }
        },
      },
      {
        text: 'Photo library',
        onPress: async () => {
          try {
            await addFromUris(await mediaService.pickFromLibrary(remaining));
          } catch (e) {
            Alert.alert(
              'Permission needed',
              e instanceof Error ? e.message : 'Could not open library.',
            );
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeAt = (index: number) => onChange(images.filter((_, i) => i !== index));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    onChange(copy);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        Up to {MEDIA_LIMITS.maxImages} photos · compressed to WebP before upload
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {images.map((img, index) => (
          <View key={`${img.uri}-${index}`} style={styles.thumbWrap}>
            <Image source={{ uri: img.uri }} style={styles.thumb} />
            {img.uploading && (
              <View style={styles.overlay}>
                <Text style={styles.overlayText}>Uploading…</Text>
              </View>
            )}
            {!!img.error && (
              <View style={[styles.overlay, styles.overlayError]}>
                <Text style={styles.overlayText}>Failed</Text>
              </View>
            )}
            <View style={styles.thumbActions}>
              <Pressable onPress={() => move(index, -1)} hitSlop={6} disabled={index === 0}>
                <Text style={[styles.thumbAction, index === 0 && styles.dim]}>‹</Text>
              </Pressable>
              <Pressable onPress={() => removeAt(index)} hitSlop={6}>
                <Text style={[styles.thumbAction, styles.remove]}>✕</Text>
              </Pressable>
              <Pressable
                onPress={() => move(index, 1)}
                hitSlop={6}
                disabled={index === images.length - 1}
              >
                <Text style={[styles.thumbAction, index === images.length - 1 && styles.dim]}>›</Text>
              </Pressable>
            </View>
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverText}>Cover</Text>
              </View>
            )}
          </View>
        ))}

        {remaining > 0 && (
          <Pressable
            style={[styles.add, (disabled || busy) && styles.addDisabled]}
            onPress={handleAdd}
            disabled={disabled || busy}
            accessibilityRole="button"
            accessibilityLabel="Add photos"
          >
            <Text style={styles.addPlus}>+</Text>
            <Text style={styles.addLabel}>Add</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary },
  row: { gap: spacing.md, paddingVertical: spacing.xs },
  thumbWrap: {
    width: 104,
    height: 104,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(34,34,34,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayError: { backgroundColor: 'rgba(224,11,65,0.7)' },
  overlayText: { ...typography.caption, color: colors.textInverse, fontWeight: '600' },
  thumbActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: 'rgba(34,34,34,0.55)',
  },
  thumbAction: { color: colors.textInverse, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  remove: { color: '#ffb3c0' },
  dim: { opacity: 0.35 },
  coverBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  coverText: { ...typography.caption, color: colors.textInverse, fontSize: 10, fontWeight: '700' },
  add: {
    width: 104,
    height: 104,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  addDisabled: { opacity: 0.45 },
  addPlus: { fontSize: 28, color: colors.textPrimary, lineHeight: 32 },
  addLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
});
